import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteClientRecord } from '@/lib/client-write';

export type ImportKind = 'clients' | 'services' | 'appointments' | 'session';

export type ImportBatchRow = {
  id: string;
  kind: ImportKind;
  created_at: string;
  file_name: string | null;
  rows_created: number;
  clients_created: number;
  services_created: number;
  appointments_created: number;
};

export type ImportSessionCounts = {
  clients: number;
  services: number;
  appointments: number;
};

export type ImportBatchDeleteResult = {
  ok: boolean;
  error: string | null;
  deleted: number;
  skipped: number;
  skippedReason?: string;
  blocked?: boolean;
};

export type ClientBatchDeleteInspect = {
  totalClients: number;
  clientsWithAppointments: number;
  appointmentCount: number;
  deletableClients: number;
  canDeleteAll: boolean;
};

export type DeleteImportBatchOptions = {
  onlyClientsWithoutAppointments?: boolean;
};

export const RECENT_IMPORT_DAYS = 30;
export const RECENT_IMPORT_LIMIT = 50;

export const IMPORT_KIND_LABEL: Record<ImportKind, string> = {
  session: 'Importación',
  clients: 'Client@s',
  services: 'Servicios',
  appointments: 'Citas',
};

export function formatImportBatchWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function countSummary(batch: ImportBatchRow): string {
  if (batch.kind === 'session') {
    const parts: string[] = [];
    if (batch.clients_created > 0) parts.push(`${batch.clients_created} client@s`);
    if (batch.services_created > 0) parts.push(`${batch.services_created} servicios`);
    if (batch.appointments_created > 0) parts.push(`${batch.appointments_created} citas`);
    if (parts.length) return parts.join(', ');
  }
  return `${batch.rows_created} altas`;
}

export function importBatchSummary(batch: ImportBatchRow): string {
  const when = formatImportBatchWhen(batch.created_at);
  const file = batch.file_name ? ` · ${batch.file_name}` : '';
  const label = batch.kind === 'session' ? 'Importación' : IMPORT_KIND_LABEL[batch.kind];
  return `${label} · ${when} · ${countSummary(batch)}${file}`;
}

export function importFileLabel(fileNames?: {
  services?: string | null;
  clients?: string | null;
  appointments?: string | null;
}): string | null {
  const parts = [fileNames?.clients, fileNames?.services, fileNames?.appointments]
    .map(s => s?.trim())
    .filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : null;
}

async function salonAdmin(sb: SupabaseClient) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, salonId: null as string | null, role: null as string | null };
  const { data } = await sb.from('staff').select('salon_id, role').eq('id', user.id).maybeSingle();
  return { user, salonId: data?.salon_id ?? null, role: data?.role ?? null };
}

export async function listRecentImportBatches(sb: SupabaseClient): Promise<ImportBatchRow[]> {
  const { salonId, role } = await salonAdmin(sb);
  if (!salonId || role !== 'admin') return [];
  const since = new Date(Date.now() - RECENT_IMPORT_DAYS * 86_400_000).toISOString();
  const { data } = await sb
    .from('import_batches')
    .select('id, kind, created_at, file_name, rows_created, clients_created, services_created, appointments_created')
    .eq('salon_id', salonId)
    .not('created_by', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(RECENT_IMPORT_LIMIT);
  return (data ?? []).map(row => ({
    ...row,
    clients_created: row.clients_created ?? 0,
    services_created: row.services_created ?? 0,
    appointments_created: row.appointments_created ?? 0,
  })) as ImportBatchRow[];
}

/** Borra lotes inferidos (sin usuario) que no son importaciones reales. */
export async function purgeInferredImportBatches(sb: SupabaseClient, salonId: string) {
  const { data: junk } = await sb
    .from('import_batches')
    .select('id')
    .eq('salon_id', salonId)
    .is('created_by', null);
  for (const batch of junk ?? []) {
    for (const table of ['clients', 'services', 'appointments'] as const) {
      await sb.from(table).update({ import_batch_id: null }).eq('import_batch_id', batch.id);
    }
    await sb.from('import_batches').delete().eq('id', batch.id);
  }
}

export async function createImportSession(
  sb: SupabaseClient,
  input: { salonId: string; userId: string; fileName?: string | null },
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await sb.from('import_batches').insert({
    salon_id: input.salonId,
    kind: 'session',
    created_by: input.userId,
    file_name: input.fileName?.trim() || null,
    rows_created: 0,
    clients_created: 0,
    services_created: 0,
    appointments_created: 0,
  }).select('id').single();
  if (error || !data) {
    return { id: null, error: error?.message ?? 'No se pudo registrar la importación' };
  }
  return { id: data.id, error: null };
}

export async function finalizeImportSession(
  sb: SupabaseClient,
  batchId: string | null,
  counts: ImportSessionCounts,
): Promise<void> {
  if (!batchId) return;
  const total = counts.clients + counts.services + counts.appointments;
  if (total <= 0) {
    await sb.from('import_batches').delete().eq('id', batchId);
    return;
  }
  await sb.from('import_batches').update({
    rows_created: total,
    clients_created: counts.clients,
    services_created: counts.services,
    appointments_created: counts.appointments,
  }).eq('id', batchId);
}

export async function inspectClientBatchDelete(
  sb: SupabaseClient,
  batchId: string,
): Promise<ClientBatchDeleteInspect | null> {
  const { data: clients, error } = await sb
    .from('clients')
    .select('id')
    .eq('import_batch_id', batchId);
  if (error) return null;
  if (!clients?.length) {
    return { totalClients: 0, clientsWithAppointments: 0, appointmentCount: 0, deletableClients: 0, canDeleteAll: true };
  }

  const clientIds = clients.map(c => c.id);
  const { data: appts, error: apptErr } = await sb
    .from('appointments')
    .select('client_id')
    .in('client_id', clientIds);
  if (apptErr) return null;

  const withAppt = new Set((appts ?? []).map(a => a.client_id));
  const clientsWithAppointments = withAppt.size;
  const appointmentCount = appts?.length ?? 0;
  const totalClients = clientIds.length;

  return {
    totalClients,
    clientsWithAppointments,
    appointmentCount,
    deletableClients: totalClients - clientsWithAppointments,
    canDeleteAll: clientsWithAppointments === 0,
  };
}

export function clientBatchDeleteBlockedText(inspect: ClientBatchDeleteInspect): string {
  const { clientsWithAppointments, appointmentCount, deletableClients } = inspect;
  const who = clientsWithAppointments === 1
    ? '1 clienta de esta importación tiene citas'
    : `${clientsWithAppointments} clientas de esta importación tienen citas`;
  const appts = appointmentCount === 1 ? '1 cita' : `${appointmentCount} citas`;
  let msg = `No se puede eliminar todo el lote: ${who} en agenda (${appts}). Borra esas citas antes si quieres quitar también esas fichas.`;
  if (deletableClients > 0) {
    const n = deletableClients === 1 ? '1 clienta sin citas' : `${deletableClients} clientas sin citas`;
    msg += ` Puedes eliminar solo ${n}.`;
  }
  return msg;
}

export function clientBatchDeletePartialConfirmText(
  batch: ImportBatchRow,
  inspect: ClientBatchDeleteInspect,
): string {
  const when = formatImportBatchWhen(batch.created_at);
  const n = inspect.deletableClients;
  const who = n === 1 ? '1 clienta sin citas' : `${n} clientas sin citas`;
  const kept = inspect.clientsWithAppointments === 1
    ? '1 clienta con citas se quedará'
    : `${inspect.clientsWithAppointments} clientas con citas se quedarán`;
  return `¿Eliminar ${who} de la importación del ${when}? ${kept} en la agenda.`;
}

async function deleteClientsInBatch(
  sb: SupabaseClient,
  batchId: string,
  options?: DeleteImportBatchOptions,
): Promise<ImportBatchDeleteResult> {
  const inspect = await inspectClientBatchDelete(sb, batchId);
  if (!inspect) return { ok: false, error: 'No se pudo comprobar la importación', deleted: 0, skipped: 0 };

  const partial = options?.onlyClientsWithoutAppointments === true;
  if (inspect.totalClients === 0) {
    return { ok: true, error: null, deleted: 0, skipped: 0 };
  }
  if (!partial && !inspect.canDeleteAll) {
    return {
      ok: false,
      error: clientBatchDeleteBlockedText(inspect),
      deleted: 0,
      skipped: inspect.clientsWithAppointments,
      blocked: true,
    };
  }
  if (partial && inspect.deletableClients === 0) {
    return {
      ok: false,
      error: 'Todas las clientas de este lote tienen citas. Borra las citas antes.',
      deleted: 0,
      skipped: inspect.clientsWithAppointments,
      blocked: true,
    };
  }

  const { data: clients, error } = await sb
    .from('clients')
    .select('id')
    .eq('import_batch_id', batchId);
  if (error) return { ok: false, error: error.message, deleted: 0, skipped: 0 };

  const clientIds = (clients ?? []).map(c => c.id);
  let blockedIds = new Set<string>();
  if (partial) {
    const { data: appts } = await sb
      .from('appointments')
      .select('client_id')
      .in('client_id', clientIds);
    blockedIds = new Set((appts ?? []).map(a => a.client_id));
  }

  let deleted = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of clients ?? []) {
    if (partial && blockedIds.has(row.id)) {
      skipped += 1;
      continue;
    }
    const r = await deleteClientRecord(sb, row.id);
    if (r.ok) deleted += 1;
    else failed += 1;
  }

  if (failed > 0) {
    return {
      ok: false,
      error: `${failed} fichas no se pudieron borrar`,
      deleted,
      skipped: skipped + failed,
    };
  }
  return {
    ok: true,
    error: null,
    deleted,
    skipped,
    skippedReason: skipped ? `${skipped} clientas con citas no se tocaron` : undefined,
  };
}

async function deleteServicesInBatch(sb: SupabaseClient, batchId: string): Promise<ImportBatchDeleteResult> {
  const { data: services, error } = await sb
    .from('services')
    .select('id')
    .eq('import_batch_id', batchId);
  if (error) return { ok: false, error: error.message, deleted: 0, skipped: 0 };

  let deleted = 0;
  let skipped = 0;
  for (const row of services ?? []) {
    const { count } = await sb
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', row.id);
    if ((count ?? 0) > 0) {
      skipped += 1;
      continue;
    }
    const { error: delErr } = await sb.from('services').delete().eq('id', row.id);
    if (delErr) skipped += 1;
    else deleted += 1;
  }

  if (deleted === 0 && skipped > 0) {
    return {
      ok: false,
      error: 'Ningún servicio se pudo borrar (tienen citas)',
      deleted,
      skipped,
      skippedReason: `${skipped} servicios tienen citas y no se borraron`,
    };
  }
  return {
    ok: true,
    error: null,
    deleted,
    skipped,
    skippedReason: skipped ? `${skipped} servicios tienen citas y no se borraron` : undefined,
  };
}

async function deleteAppointmentsInBatch(sb: SupabaseClient, batchId: string): Promise<ImportBatchDeleteResult> {
  const { data, error } = await sb
    .from('appointments')
    .delete()
    .eq('import_batch_id', batchId)
    .select('id');
  if (error) return { ok: false, error: error.message, deleted: 0, skipped: 0 };
  return { ok: true, error: null, deleted: data?.length ?? 0, skipped: 0 };
}

async function deleteSessionBatch(
  sb: SupabaseClient,
  batchId: string,
  options?: DeleteImportBatchOptions,
): Promise<ImportBatchDeleteResult> {
  const clients = await deleteClientsInBatch(sb, batchId, options);
  if (!clients.ok && clients.blocked) return clients;

  const services = await deleteServicesInBatch(sb, batchId);
  const appts = await deleteAppointmentsInBatch(sb, batchId);

  const deleted = clients.deleted + services.deleted + appts.deleted;
  const skipped = clients.skipped + services.skipped + appts.skipped;
  const reasons = [clients.skippedReason, services.skippedReason].filter(Boolean);

  const { count: remainingClients } = await sb
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('import_batch_id', batchId);
  const { count: remainingServices } = await sb
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('import_batch_id', batchId);
  const { count: remainingAppts } = await sb
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('import_batch_id', batchId);
  const remaining = (remainingClients ?? 0) + (remainingServices ?? 0) + (remainingAppts ?? 0);

  if (remaining <= 0) {
    await sb.from('import_batches').delete().eq('id', batchId);
  } else {
    await sb.from('import_batches').update({
      rows_created: remaining,
      clients_created: remainingClients ?? 0,
      services_created: remainingServices ?? 0,
      appointments_created: remainingAppts ?? 0,
    }).eq('id', batchId);
  }

  if (deleted === 0 && !clients.ok && clients.error) {
    return { ok: false, error: clients.error, deleted: 0, skipped, blocked: clients.blocked };
  }

  return {
    ok: deleted > 0 || remaining === 0,
    error: deleted > 0 ? null : (clients.error ?? services.error ?? appts.error),
    deleted,
    skipped,
    skippedReason: reasons.length ? reasons.join('. ') : undefined,
  };
}

export async function deleteImportBatch(
  sb: SupabaseClient,
  batchId: string,
  options?: DeleteImportBatchOptions,
): Promise<ImportBatchDeleteResult> {
  const { salonId, role } = await salonAdmin(sb);
  if (!salonId) return { ok: false, error: 'Sin sesión', deleted: 0, skipped: 0 };
  if (role !== 'admin') return { ok: false, error: 'Solo dirección puede deshacer importaciones', deleted: 0, skipped: 0 };

  const { data: batch, error: batchErr } = await sb
    .from('import_batches')
    .select('id, kind, salon_id')
    .eq('id', batchId)
    .maybeSingle();
  if (batchErr) return { ok: false, error: batchErr.message, deleted: 0, skipped: 0 };
  if (!batch || batch.salon_id !== salonId) {
    return { ok: false, error: 'Importación no encontrada', deleted: 0, skipped: 0 };
  }

  if (batch.kind === 'session') {
    return deleteSessionBatch(sb, batchId, options);
  }

  switch (batch.kind as ImportKind) {
    case 'clients': {
      const r = await deleteClientsInBatch(sb, batchId, options);
      if (r.ok || r.deleted > 0) await sb.from('import_batches').delete().eq('id', batchId);
      else if (!r.blocked) {
        const { count } = await sb.from('clients').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId);
        if ((count ?? 0) === 0) await sb.from('import_batches').delete().eq('id', batchId);
        else await sb.from('import_batches').update({ rows_created: count ?? 0 }).eq('id', batchId);
      }
      return r;
    }
    case 'services': {
      const r = await deleteServicesInBatch(sb, batchId);
      const { count } = await sb
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('import_batch_id', batchId);
      if ((count ?? 0) === 0) await sb.from('import_batches').delete().eq('id', batchId);
      return r;
    }
    case 'appointments':
      return deleteAppointmentsInBatch(sb, batchId).then(async r => {
        await sb.from('import_batches').delete().eq('id', batchId);
        return r;
      });
    default:
      return { ok: false, error: 'Tipo de importación desconocido', deleted: 0, skipped: 0 };
  }
}

export function deleteImportBatchConfirmText(batch: ImportBatchRow): string {
  const when = formatImportBatchWhen(batch.created_at);
  const summary = countSummary(batch);
  const base = `¿Eliminar la importación del ${when}? Se borrarán ${summary}.`;
  if (batch.clients_created > 0 || batch.kind === 'clients') {
    return `${base} Las clientas con citas en agenda no se borrarán.`;
  }
  return base;
}

export function batchHasClientas(batch: ImportBatchRow): boolean {
  return batch.clients_created > 0 || batch.kind === 'clients';
}
