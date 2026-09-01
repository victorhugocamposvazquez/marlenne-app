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
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-5">
      <AjustesHeader
        title="Servicios"
        subtitle="Categorías y lo que se vende. Es el catálogo de la agenda, no la ficha clínica."
      />
      <CatalogEditor categories={categories} services={services} />
    </div>
  );
}