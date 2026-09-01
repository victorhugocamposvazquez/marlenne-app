import { requireRole } from '@/lib/require-session';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import CsvImportCard from '@/components/CsvImportCard';

export default async function ImportarPage() {
  await requireRole('admin');

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-5">
      <AjustesHeader
        title="Importar CSV"
        subtitle="Una mudanza, no un sync. Servicios, clientas y citas."
      />
      <CsvImportCard />
    </div>
  );
}