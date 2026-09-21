import { requireRole } from '@/lib/require-session';
import { listCategories, listServices } from '@/lib/queries';
import ServiciosView from '@/components/catalog/ServiciosView';

export default async function ServiciosPage() {
  await requireRole('admin');
  const [categories, services] = await Promise.all([
    listCategories(),
    listServices({ includeInactive: true }),
  ]);

  return <ServiciosView categories={categories} services={services} />;
}