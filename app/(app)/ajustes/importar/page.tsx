import { requireRole } from '@/lib/require-session';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import CsvImportCard from '@/components/CsvImportCard';
import ImportBatchHistory from '@/components/ImportBatchHistory';
import { loadImportBatches } from '@/app/actions/import-batches';

export default async function ImportarPage() {
  await requireRole('admin');
  const { batches, error: batchesErr } = await loadImportBatches();

  return (
    <AjustesHeader title="Importar datos">
      <CsvImportCard />
      {batchesErr && (
        <p className="mt-4 rounded-row bg-surface-soft p-4 text-label font-semibold text-danger-fg">
          No se pudo cargar el historial. Aplica la migración de permisos en Supabase (`import_batches_grants`).
        </p>
      )}
      <ImportBatchHistory initialBatches={batches} loadError={batchesErr} />
    </AjustesHeader>
  );
}