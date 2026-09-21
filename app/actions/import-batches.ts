'use server';

import { requireRole } from '@/lib/require-session';
import {
  backfillUntaggedImportBatches,
  listRecentImportBatches,
  type ImportBatchRow,
} from '@/lib/import-batch';
import { createClient } from '@/lib/supabase/server';

export async function loadImportBatches(): Promise<{
  batches: ImportBatchRow[];
  error: string | null;
}> {
  const me = await requireRole('admin');
  const sb = createClient();
  await backfillUntaggedImportBatches(sb, me.salon_id);
  const batches = await listRecentImportBatches(sb);
  const { error } = await sb.from('import_batches').select('id').limit(1);
  if (error && !batches.length) {
    return { batches: [], error: error.message };
  }
  return { batches, error: null };
}
