import { requireRole } from '@/lib/require-session';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import CsvImportCard from '@/components/CsvImportCard';

export default async function ImportarPage() {
  await requireRole('admin');

  return (
    <AjustesHeader title="Importar CSV">
      <CsvImportCard />
    </AjustesHeader>
  );
}