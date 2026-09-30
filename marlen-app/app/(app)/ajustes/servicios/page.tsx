import { requireRole } from '@/lib/require-session';
import { listCategories, listSalonPackTemplates, listServices } from '@/lib/queries';
import ServiciosView from '@/components/catalog/ServiciosView';

export default async function ServiciosPage() {
  await requireRole('admin');
  const [categories, services, templates] = await Promise.all([
    listCategories(),
    listServices({ includeInactive: true }),
    listSalonPackTemplates(),
  ]);

  return <ServiciosView categories={categories} services={services} templates={templates} />;
}
