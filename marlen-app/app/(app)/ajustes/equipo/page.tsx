import { requireSession } from '@/lib/require-session';
import { listStaff } from '@/lib/queries';
import EquipoView from '@/components/team/EquipoView';

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: { miembro?: string };
}) {
  const me = await requireSession();
  const team = await listStaff({ includeInactive: me.role === 'admin' });

  return (
    <EquipoView
      team={team}
      meId={me.id}
      initialMiembro={searchParams.miembro === '1'}
      admin={me.role === 'admin'}
    />
  );
}
