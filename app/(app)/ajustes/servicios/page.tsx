import { requireRole } from '@/lib/require-session';
import { listCategories, listServices } from '@/lib/queries';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import CatalogEditor from '@/components/CatalogEditor';

export default async function ServiciosPage() {
  await requireRole('admin');
  const [categories, services] = await Promise.all([
    listCategories(),
    listServices({ includeInactive: true }),
  ]);

  return (
    <AjustesHeader title="Servicios">
      <CatalogEditor categories={categories} services={services} />
    </AjustesHeader>
  );
}