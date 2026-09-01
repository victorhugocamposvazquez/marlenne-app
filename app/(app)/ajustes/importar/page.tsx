import { requireRole } from '@/lib/require-session';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import CsvImportCard from '@/components/CsvImportCard';

export default async function ImportarPage() {
  await requireRole('admin');

  return (
    <AjustesHeader
      title="Importar CSV"
      subtitle="Una mudanza, no un sync. Servicios, clientas y citas."
    >
      <CsvImportCard />
    </AjustesHeader>
  );
}