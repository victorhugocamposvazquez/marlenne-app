import { requireRole } from '@/lib/require-session';
import { listSalonPackTemplates, listServices, listSoldPacks } from '@/lib/queries';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import PackTemplatesEditor from '@/components/PackTemplatesEditor';
import SoldPacksCard from '@/components/SoldPacksCard';

export default async function BonosPage() {
  const me = await requireRole('admin', 'reception');
  const admin = me.role === 'admin';
  const [templates, services, packs] = await Promise.all([
    admin ? listSalonPackTemplates() : Promise.resolve([]),
    admin ? listServices({ includeInactive: true }) : Promise.resolve([]),
    listSoldPacks(),
  ]);

  return (
    <AjustesHeader title="Bonos">
      {admin && (
        <section className="mb-6">
          <h2 className="mb-2.5 text-body-lg font-bold text-ink">
            Plantillas · {templates.length}
          </h2>
          <p className="mb-3 text-body text-ink-2">
            Lo que se vende: 6 láser, 4 cavitación.
          </p>
          <PackTemplatesEditor templates={templates} services={services} />
        </section>
      )}
      <SoldPacksCard packs={packs} canEdit className="mt-0" />
    </AjustesHeader>
  );
}