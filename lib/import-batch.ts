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
};

export const RECENT_IMPORT_DAYS = 30;
export const RECENT_IMPORT_LIMIT = 50;

export const IMPORT_KIND_LABEL: Record<ImportKind, string> = {
  clients: 'Clientas',
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
): Promise<string | null> {
  const { data, error } = await sb.from('import_batches').insert({
    salon_id: input.salonId,
    kind: input.kind,
    created_by: input.userId,
    file_name: input.fileName?.trim() || null,
    rows_created: 0,
  }).select('id').single();
  if (error || !data) return null;
  return data.id;
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

async function deleteClientsBatch(sb: SupabaseClient, batchId: string): Promise<ImportBatchDeleteResult> {
  const { data: clients, error } = await sb
    .from('clients')
    .select('id')
    .eq('import_batch_id', batchId);
  if (error) return { ok: false, error: error.message, deleted: 0, skipped: 0 };

  let deleted = 0;
  let failed = 0;
  for (const row of clients ?? []) {
    const r = await deleteClientRecord(sb, row.id);
    if (r.ok) deleted += 1;
    else failed += 1;
  }

  if (failed === 0) {
    await sb.from('import_batches').delete().eq('id', batchId);
    return { ok: true, error: null, deleted, skipped: 0 };
  }

  await sb.from('import_batches').update({ rows_created: failed }).eq('id', batchId);
  return {
    ok: false,
    error: `${failed} fichas no se pudieron borrar`,
    deleted,
    skipped: failed,
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
      return deleteClientsBatch(sb, batchId);
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
    return `${base} Las citas en agenda quedarán solo con el nombre.`;
  }
  if (batch.kind === 'services') {
    return `${base} Los que ya tengan citas no se borrarán.`;
  }
  return base;
}
