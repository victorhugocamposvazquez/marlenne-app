'use server';

import { requireRole } from '@/lib/require-session';
import {
  listRecentImportBatches,
  purgeInferredImportBatches,
  rebuildMissingImportBatches,
  type ImportBatchRow,
} from '@/lib/import-batch';
import { createClient } from '@/lib/supabase/server';

export async function loadImportBatches(): Promise<{
  batches: ImportBatchRow[];
  error: string | null;
}> {
  const me = await requireRole('admin');
  const sb = createClient();
  await rebuildMissingImportBatches(sb, me.salon_id, me.id);
  await purgeInferredImportBatches(sb, me.salon_id);
  const batches = await listRecentImportBatches(sb);
  return { batches, error: null };
}
