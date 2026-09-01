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
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-5">
      <AjustesHeader
        title="Bonos"
        subtitle={admin
          ? 'Plantillas para vender. Recarga en los vendidos. El pack amigo se marca en la ficha.'
          : 'Recargar sesiones. Vender uno nuevo, en la ficha.'}
      />
      {admin && (
        <section className="mb-6">
          <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">
            Plantillas · {templates.length}
          </h2>
          <p className="mb-2.5 text-label font-medium text-ink-2">
            Lo que se vende: 6 láser, 4 cavitación.
          </p>
          <PackTemplatesEditor templates={templates} services={services} />
        </section>
      )}
      <SoldPacksCard packs={packs} canEdit className="mt-0" />
    </div>
  );
}