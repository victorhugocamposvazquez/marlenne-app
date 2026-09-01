import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImportPreview, PreviewAppointment, PreviewClient, PreviewService } from '@/lib/csv-import';

export type ImportApplyResult = {
  ok: boolean;
  error: string | null;
  created: { services: number; clients: number; appointments: number };
  failedAppointments: number;
};

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
) {
  let created = 0;
  for (const row of rows) {
    if (row.existingId) {
      ids.set(`new-svc:${row.row}`, row.existingId);
      continue;
    }
    if (row.action !== 'create') continue;
    const { data, error } = await sb.from('services').insert({
      salon_id: salonId,
      name: row.name,
      category: row.category,
      duration_min: row.duration_min,
      price_cents: row.price_cents,
      sort_order: 800 + row.row,
    }).select('id').single();
    if (error || !data) continue;
    ids.set(`new-svc:${row.row}`, data.id);
    created += 1;
  }
  return created;
}

async function insertClients(
  sb: SupabaseClient,
  salonId: string,
  rows: PreviewClient[],
  ids: Map<string, string>,
) {
  let created = 0;
  for (const row of rows) {
    if (row.existingId) {
      ids.set(`new-cli:${row.row}`, row.existingId);
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
    }).select('id').single();
    if (error || !data) continue;
    ids.set(`new-cli:${row.row}`, data.id);
    created += 1;
  }
  return created;
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
    });
    if (error) failed += 1;
    else created += 1;
  }
  return { created, failed };
}

export async function applyCsvImport(
  sb: SupabaseClient,
  preview: ImportPreview,
): Promise<ImportApplyResult> {
  const empty = { services: 0, clients: 0, appointments: 0 };
  const { user, salonId, role } = await salonOf(sb);
  if (!user || !salonId) return { ok: false, error: 'Sin sesión', created: empty, failedAppointments: 0 };
  if (role !== 'admin') return { ok: false, error: 'Solo dirección puede importar', created: empty, failedAppointments: 0 };
  if (preview.fileErrors.length) {
    return { ok: false, error: preview.fileErrors[0], created: empty, failedAppointments: 0 };
  }

  const ids = new Map<string, string>();
  const services = await insertServices(sb, salonId, preview.services, ids);
  const clients = await insertClients(sb, salonId, preview.clients, ids);
  const appts = await insertAppointments(sb, salonId, user.id, preview.appointments, ids);

  return {
    ok: true,
    error: null,
    created: { services, clients, appointments: appts.created },
    failedAppointments: appts.failed,
  };
}
