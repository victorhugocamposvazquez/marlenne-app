import { requireSession } from '@/lib/require-session';
import { listStaff, listServices, listSalonPackTemplates, listSoldPacks } from '@/lib/queries';
import { getReadyStatus } from '@/lib/ready';
import AjustesView from '@/components/AjustesView';

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: { zona?: string };
}) {
  const me = await requireSession();
  const desk = me.role === 'admin' || me.role === 'reception';
  const [team, services, templates, packs, ready] = await Promise.all([
    listStaff({ includeInactive: me.role === 'admin' }),
    me.role === 'admin' ? listServices({ includeInactive: true }) : Promise.resolve([]),
    me.role === 'admin' ? listSalonPackTemplates() : Promise.resolve([]),
    desk ? listSoldPacks() : Promise.resolve([]),
    me.role === 'admin' ? getReadyStatus() : Promise.resolve([]),
  ]);
  const zona = searchParams.zona === 'cuenta' || searchParams.zona === 'centro'
    ? searchParams.zona
    : undefined;

  return (
    <AjustesView
      me={{ id: me.id, full_name: me.full_name, job_title: me.job_title, role: me.role }}
      team={team}
      services={services}
      templates={templates}
      packs={packs}
      ready={ready}
      initialZona={zona}
    />
  );
}
