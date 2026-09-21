'use server';

import { requireRole } from '@/lib/require-session';
import {
  listRecentImportBatches,
  syncImportBatchHistory,
  type ImportBatchRow,
} from '@/lib/import-batch';
import { createClient } from '@/lib/supabase/server';

export async function loadImportBatches(): Promise<{
  batches: ImportBatchRow[];
  error: string | null;
}> {
  const me = await requireRole('admin');
  const sb = createClient();
  await syncImportBatchHistory(sb, me.salon_id, me.id);
  const batches = await listRecentImportBatches(sb);
  return { batches, error: null };
}
