'use server';

import { requireRole } from '@/lib/require-session';
import {
  deleteImportBatch,
  inspectClientBatchDelete,
  listRecentImportBatches,
  syncImportBatchHistory,
  type ClientBatchDeleteInspect,
  type DeleteImportBatchOptions,
  type ImportBatchDeleteResult,
  type ImportBatchRow,
} from '@/lib/import-batch';
import { createClient } from '@/lib/supabase/server';

export async function loadImportBatches(): Promise<{
  batches: ImportBatchRow[];
  error: string | null;
}> {
  const me = await requireRole('admin');
  const sb = createClient();
  const syncErr = await syncImportBatchHistory(sb, me.salon_id, me.id);
  const batches = await listRecentImportBatches(sb);
  return { batches, error: syncErr };
}

export async function inspectImportBatchDelete(
  batchId: string,
): Promise<ClientBatchDeleteInspect | null> {
  await requireRole('admin');
  const sb = createClient();
  return inspectClientBatchDelete(sb, batchId);
}

export async function removeImportBatch(
  batchId: string,
  options?: DeleteImportBatchOptions,
): Promise<ImportBatchDeleteResult> {
  await requireRole('admin');
  const sb = createClient();
  return deleteImportBatch(sb, batchId, options);
}
