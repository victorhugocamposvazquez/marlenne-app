import { requireRole } from '@/lib/require-session';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import CsvImportCard from '@/components/CsvImportCard';
import ImportBatchHistory from '@/components/ImportBatchHistory';
import { RECENT_IMPORT_DAYS, RECENT_IMPORT_LIMIT, type ImportBatchRow } from '@/lib/import-batch';
import { createClient } from '@/lib/supabase/server';

export default async function ImportarPage() {
  await requireRole('admin');

  const sb = createClient();
  const since = new Date(Date.now() - RECENT_IMPORT_DAYS * 86_400_000).toISOString();
  const { data: batches } = await sb
    .from('import_batches')
    .select('id, kind, created_at, file_name, rows_created')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(RECENT_IMPORT_LIMIT);

  return (
    <AjustesHeader title="Importar datos">
      <CsvImportCard />
      <ImportBatchHistory batches={(batches ?? []) as ImportBatchRow[]} />
    </AjustesHeader>
  );
}