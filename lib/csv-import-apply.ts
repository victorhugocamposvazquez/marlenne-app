import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImportPreview, PreviewAppointment, PreviewClient, PreviewService } from '@/lib/csv-import';
import {
  createImportSession,
  finalizeImportSession,
  importFileLabel,
} from '@/lib/import-batch';

export type ImportFileNames = {
  services?: string | null;
  clients?: string | null;
  appointments?: string | null;
};

export type ImportApplyResult = {
  ok: boolean;
  error: string | null;
  created: { services: number; clients: number; appointments: number };
  failedClients: number;
  failedAppointments: number;
};

export type ImportProgress = { done: number; total: number; pct: number };

export function countImportSteps(preview: ImportPreview): number {
  let n = 0;
  for (const s of preview.services) {
    if (s.existingId || s.action === 'create') n += 1;
  }
  for (const c of preview.clients) {
    if (c.existingId || c.action === 'create') n += 1;
  }
  for (const a of preview.appointments) {
    if (a.action === 'create' && a.starts_at) n += 1;
  }
  return n;
}

async function salonOf(sb: SupabaseClient) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, salonId: null as string | null, role: null as string | null };
  const { data } = await sb.from('staff').select('salon_id, role').eq('id', user.id).maybeSingle();
  return { user, salonId: data?.salon_id ?? null, role: data?.role ?? null };
}

function isNewKey(id?: string) {
  return !!id && (id.startsWith('new-cli:') || id.startsWith('new-svc:'));
}

async function insertServices(
  sb: SupabaseClient,
  salonId: string,
  rows: PreviewService[],
  ids: Map<string, string>,
  batchId: string | null,
  onStep?: () => void,
) {
  let created = 0;
  for (const row of rows) {
    if (row.existingId) {
      ids.set(`new-svc:${row.row}`, row.existingId);
      onStep?.();
      continue;
    }
    if (row.action !== 'create') continue;
    const { data: cat } = await sb
      .from('service_categories')
      .select('id')
      .eq('salon_id', salonId)
      .eq('slug', row.category)
      .maybeSingle();
    const { data, error } = await sb.from('services').insert({
      salon_id: salonId,
      name: row.name,
      ...(cat?.id ? { category_id: cat.id } : { category: row.category }),
      duration_min: row.duration_min,
      price_cents: row.price_cents,
      sort_order: 800 + row.row,
      ...(batchId ? { import_batch_id: batchId } : {}),
    }).select('id').single();
    if (error || !data) {
      onStep?.();
      continue;
    }
    ids.set(`new-svc:${row.row}`, data.id);
    created += 1;
    onStep?.();
  }
  return created;
}

async function insertClients(
  sb: SupabaseClient,
  salonId: string,
  rows: PreviewClient[],
  ids: Map<string, string>,
  batchId: string | null,
  onStep?: () => void,
) {
  let created = 0;
  let failed = 0;
  for (const row of rows) {
    if (row.existingId) {
      ids.set(`new-cli:${row.row}`, row.existingId);
      onStep?.();
      continue;
    }
    if (row.action !== 'create') continue;
    const { data, error } = await sb.from('clients').insert({
      salon_id: salonId,
      full_name: row.full_name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      tags: row.tags,
      ...(batchId ? { import_batch_id: batchId } : {}),
    }).select('id').single();
    if (error || !data) {
      failed += 1;
      onStep?.();
      continue;
    }
    ids.set(`new-cli:${row.row}`, data.id);
    created += 1;
    onStep?.();
  }
  return { created, failed };
}

function resolveId(raw: string | undefined, ids: Map<string, string>) {
  if (!raw) return null;
  if (!isNewKey(raw)) return raw;
  return ids.get(raw) ?? null;
}

async function insertAppointments(
  sb: SupabaseClient,
  salonId: string,
  userId: string,
  rows: PreviewAppointment[],
  ids: Map<string, string>,
  batchId: string | null,
  onStep?: () => void,
) {
  let created = 0;
  let failed = 0;
  for (const row of rows) {
    if (row.action !== 'create' || !row.starts_at) continue;
    const clientId = resolveId(row.clientId, ids);
    const serviceId = resolveId(row.serviceId, ids);
    const providerId = row.providerId;
    if (!clientId || !serviceId || !providerId) {
      failed += 1;
      onStep?.();
      continue;
    }
    const { error } = await sb.from('appointments').insert({
      salon_id: salonId,
      client_id: clientId,
      service_id: serviceId,
      provider_id: providerId,
      starts_at: row.starts_at,
      duration_min: row.duration_min,
      status: row.status,
      note: row.note,
      created_by: userId,
      ...(batchId ? { import_batch_id: batchId } : {}),
    });
    if (error) failed += 1;
    else created += 1;
    onStep?.();
  }
  return { created, failed };
}

function hasCreates(rows: { action: string }[]) {
  return rows.some(r => r.action === 'create');
}

function willCreateAnything(preview: ImportPreview) {
  return hasCreates(preview.services) || hasCreates(preview.clients) || hasCreates(preview.appointments);
}

export async function applyCsvImport(
  sb: SupabaseClient,
  preview: ImportPreview,
  onProgress?: (p: ImportProgress) => void,
  fileNames?: ImportFileNames,
): Promise<ImportApplyResult> {
  const empty = { services: 0, clients: 0, appointments: 0 };
  const { user, salonId, role } = await salonOf(sb);
  if (!user || !salonId) {
    return { ok: false, error: 'Sin sesión', created: empty, failedClients: 0, failedAppointments: 0 };
  }
  if (role !== 'admin') {
    return { ok: false, error: 'Solo dirección puede importar', created: empty, failedClients: 0, failedAppointments: 0 };
  }
  if (preview.fileErrors.length) {
    return { ok: false, error: preview.fileErrors[0], created: empty, failedClients: 0, failedAppointments: 0 };
  }

  const ids = new Map<string, string>();
  const total = countImportSteps(preview);
  let done = 0;
  const tick = () => {
    done += 1;
    onProgress?.({
      done,
      total,
      pct: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 100,
    });
  };
  onProgress?.({ done: 0, total, pct: 0 });
  const userId = user.id;

  let sessionId: string | null = null;
  if (willCreateAnything(preview)) {
    const session = await createImportSession(sb, {
      salonId,
      userId,
      fileName: importFileLabel(fileNames),
    });
    if (!session.id) {
      return {
        ok: false,
        error: session.error ?? 'No se pudo registrar la importación en el historial',
        created: empty,
        failedClients: 0,
        failedAppointments: 0,
      };
    }
    sessionId = session.id;
  }

  const services = await insertServices(sb, salonId, preview.services, ids, sessionId, tick);
  const clients = await insertClients(sb, salonId, preview.clients, ids, sessionId, tick);
  const appts = await insertAppointments(sb, salonId, userId, preview.appointments, ids, sessionId, tick);

  await finalizeImportSession(sb, sessionId, {
    clients: clients.created,
    services,
    appointments: appts.created,
  });

  onProgress?.({ done: total, total, pct: 100 });

  return {
    ok: true,
    error: null,
    created: { services, clients: clients.created, appointments: appts.created },
    failedClients: clients.failed,
    failedAppointments: appts.failed,
  };
}
