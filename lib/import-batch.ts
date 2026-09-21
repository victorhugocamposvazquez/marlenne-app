import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteClientRecord } from '@/lib/client-write';

export type ImportKind = 'clients' | 'services' | 'appointments';

export type ImportBatchRow = {
  id: string;
  kind: ImportKind;
  created_at: string;
  file_name: string | null;
  rows_created: number;
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
  /** Solo clientas del lote que no tienen citas en agenda. */
  onlyClientsWithoutAppointments?: boolean;
};

export const RECENT_IMPORT_DAYS = 30;
export const RECENT_IMPORT_LIMIT = 50;

export const IMPORT_KIND_LABEL: Record<ImportKind, string> = {
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

export function importBatchSummary(batch: ImportBatchRow): string {
  const when = formatImportBatchWhen(batch.created_at);
  const file = batch.file_name ? ` · ${batch.file_name}` : '';
  return `${IMPORT_KIND_LABEL[batch.kind]} · ${when} · ${batch.rows_created} altas${file}`;
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
    .select('id, kind, created_at, file_name, rows_created')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(RECENT_IMPORT_LIMIT);
  return (data ?? []) as ImportBatchRow[];
}

export async function createImportBatch(
  sb: SupabaseClient,
  input: { salonId: string; userId: string; kind: ImportKind; fileName?: string | null },
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await sb.from('import_batches').insert({
    salon_id: input.salonId,
    kind: input.kind,
    created_by: input.userId,
    file_name: input.fileName?.trim() || null,
    rows_created: 0,
  }).select('id').single();
  if (error || !data) {
    return {
      id: null,
      error: error?.message ?? 'No se pudo registrar el lote de importación',
    };
  }
  return { id: data.id, error: null };
}

/** Altas seguidas dentro de este margen = mismo lote (una importación). */
const IMPORT_CLUSTER_GAP_MS = 15 * 60 * 1000;
const MIN_BACKFILL_GROUP = 2;

function clusterByTimeGap(rows: { id: string; created_at: string }[], gapMs: number) {
  if (!rows.length) return [] as { ids: string[]; at: string }[];
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const groups: { ids: string[]; at: string }[] = [];
  let cur = {
    ids: [sorted[0].id],
    at: sorted[0].created_at,
    lastMs: +new Date(sorted[0].created_at),
  };
  for (let i = 1; i < sorted.length; i++) {
    const ms = +new Date(sorted[i].created_at);
    if (ms - cur.lastMs <= gapMs) {
      cur.ids.push(sorted[i].id);
      cur.lastMs = ms;
    } else {
      groups.push({ ids: cur.ids, at: cur.at });
      cur = { ids: [sorted[i].id], at: sorted[i].created_at, lastMs: ms };
    }
  }
  groups.push({ ids: cur.ids, at: cur.at });
  return groups;
}

async function tagRowsWithBatch(
  sb: SupabaseClient,
  table: 'clients' | 'appointments',
  batchId: string,
  ids: string[],
) {
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error } = await sb.from(table).update({ import_batch_id: batchId }).in('id', chunk);
    if (error) return false;
  }
  return true;
}

/** Quita lotes de 1 fila sin archivo (restos del backfill por minuto). */
async function dissolveFragmentedBatches(sb: SupabaseClient, salonId: string) {
  const { data: tiny } = await sb
    .from('import_batches')
    .select('id, kind')
    .eq('salon_id', salonId)
    .eq('rows_created', 1)
    .is('file_name', null)
    .in('kind', ['clients', 'appointments']);
  for (const batch of tiny ?? []) {
    const table = batch.kind === 'appointments' ? 'appointments' : 'clients';
    await sb.from(table).update({ import_batch_id: null }).eq('import_batch_id', batch.id);
    await sb.from('import_batches').delete().eq('id', batch.id);
  }
}

async function backfillTable(
  sb: SupabaseClient,
  salonId: string,
  kind: ImportKind,
  table: 'clients' | 'appointments',
) {
  const since = new Date(Date.now() - RECENT_IMPORT_DAYS * 86_400_000).toISOString();
  const { data: rows, error } = await sb
    .from(table)
    .select('id, created_at')
    .eq('salon_id', salonId)
    .is('import_batch_id', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  const typed = (rows ?? []) as { id: string; created_at: string }[];
  if (error || !typed.length) return 0;

  const groups = clusterByTimeGap(typed, IMPORT_CLUSTER_GAP_MS).filter(g => g.ids.length >= MIN_BACKFILL_GROUP);

  let created = 0;
  for (const group of groups) {
    if (group.ids.length === 0) continue;
    const { data: batch, error: insErr } = await sb
      .from('import_batches')
      .insert({
        salon_id: salonId,
        kind,
        rows_created: group.ids.length,
        created_at: group.at,
      })
      .select('id')
      .single();
    if (insErr || !batch) continue;
    if (await tagRowsWithBatch(sb, table, batch.id, group.ids)) created += 1;
  }
  return created;
}

/** Recupera lotes de filas importadas sin `import_batch_id` (p. ej. antes de permisos GRANT). */
export async function backfillUntaggedImportBatches(sb: SupabaseClient, salonId: string) {
  await dissolveFragmentedBatches(sb, salonId);
  const clients = await backfillTable(sb, salonId, 'clients', 'clients');
  const appts = await backfillTable(sb, salonId, 'appointments', 'appointments');
  return clients + appts;
}

export async function finalizeImportBatch(
  sb: SupabaseClient,
  batchId: string | null,
  rowsCreated: number,
): Promise<void> {
  if (!batchId) return;
  if (rowsCreated <= 0) {
    await sb.from('import_batches').delete().eq('id', batchId);
    return;
  }
  await sb.from('import_batches').update({ rows_created: rowsCreated }).eq('id', batchId);
}

export async function inspectClientBatchDelete(
  sb: SupabaseClient,
  batchId: string,
): Promise<ClientBatchDeleteInspect | null> {
  const { data: clients, error } = await sb
    .from('clients')
    .select('id')
    .eq('import_batch_id', batchId);
  if (error || !clients?.length) {
    return clients?.length === 0
      ? { totalClients: 0, clientsWithAppointments: 0, appointmentCount: 0, deletableClients: 0, canDeleteAll: true }
      : null;
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
  const deletableClients = totalClients - clientsWithAppointments;

  return {
    totalClients,
    clientsWithAppointments,
    appointmentCount,
    deletableClients,
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

async function deleteClientsBatch(
  sb: SupabaseClient,
  batchId: string,
  options?: DeleteImportBatchOptions,
): Promise<ImportBatchDeleteResult> {
  const inspect = await inspectClientBatchDelete(sb, batchId);
  if (!inspect) return { ok: false, error: 'No se pudo comprobar la importación', deleted: 0, skipped: 0 };
  if (inspect.totalClients === 0) {
    await sb.from('import_batches').delete().eq('id', batchId);
    return { ok: true, error: null, deleted: 0, skipped: 0 };
  }

  const partial = options?.onlyClientsWithoutAppointments === true;
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

  const remaining = (clients?.length ?? 0) - deleted;
  if (remaining <= 0 && failed === 0) {
    await sb.from('import_batches').delete().eq('id', batchId);
    return { ok: true, error: null, deleted, skipped };
  }

  await sb.from('import_batches').update({ rows_created: remaining }).eq('id', batchId);
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
    skippedReason: skipped
      ? `${skipped} clientas con citas no se tocaron`
      : undefined,
  };
}

async function deleteServicesBatch(sb: SupabaseClient, batchId: string): Promise<ImportBatchDeleteResult> {
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

  const remaining = (services?.length ?? 0) - deleted;
  if (remaining <= 0) {
    await sb.from('import_batches').delete().eq('id', batchId);
    return { ok: true, error: null, deleted, skipped };
  }

  await sb.from('import_batches').update({ rows_created: remaining }).eq('id', batchId);
  const skippedReason = skipped
    ? `${skipped} servicios tienen citas y no se borraron`
    : undefined;
  if (deleted === 0) {
    return {
      ok: false,
      error: 'Ningún servicio se pudo borrar (tienen citas)',
      deleted,
      skipped,
      skippedReason,
    };
  }
  return {
    ok: true,
    error: null,
    deleted,
    skipped,
    skippedReason,
  };
}

async function deleteAppointmentsBatch(sb: SupabaseClient, batchId: string): Promise<ImportBatchDeleteResult> {
  const { data, error } = await sb
    .from('appointments')
    .delete()
    .eq('import_batch_id', batchId)
    .select('id');
  if (error) return { ok: false, error: error.message, deleted: 0, skipped: 0 };
  const deleted = data?.length ?? 0;
  await sb.from('import_batches').delete().eq('id', batchId);
  return { ok: true, error: null, deleted, skipped: 0 };
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

  switch (batch.kind as ImportKind) {
    case 'clients':
      return deleteClientsBatch(sb, batchId, options);
    case 'services':
      return deleteServicesBatch(sb, batchId);
    case 'appointments':
      return deleteAppointmentsBatch(sb, batchId);
    default:
      return { ok: false, error: 'Tipo de importación desconocido', deleted: 0, skipped: 0 };
  }
}

export function deleteImportBatchConfirmText(batch: ImportBatchRow): string {
  const when = formatImportBatchWhen(batch.created_at);
  const kind = IMPORT_KIND_LABEL[batch.kind].toLowerCase();
  const base = `¿Eliminar la importación de ${kind} del ${when}? Se borrarán ${batch.rows_created} registros.`;
  if (batch.kind === 'clients') {
    return `${base} Solo si ninguna tiene citas en agenda.`;
  }
  if (batch.kind === 'services') {
    return `${base} Los que ya tengan citas no se borrarán.`;
  }
  return base;
}
