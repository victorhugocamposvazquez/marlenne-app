import { requireSession } from '@/lib/require-session';
import { listStaff } from '@/lib/queries';
import { avatarColor } from '@/lib/categories';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import TeamEditor from '@/components/TeamEditor';
import EquipoHeaderAction from '@/components/team/EquipoHeaderAction';

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: { miembro?: string };
}) {
  const me = await requireSession();
  const team = await listStaff({ includeInactive: me.role === 'admin' });

  return (
    <AjustesHeader title="Equipo" extra={me.role === 'admin' ? <EquipoHeaderAction /> : undefined}>
      {me.role === 'admin' ? (
        <TeamEditor team={team} meId={me.id} initialMiembro={searchParams.miembro === '1'} />
      ) : (
        <div className="flex flex-col gap-2">
          {team.map(p => (
            <div key={p.id} className="flex items-center gap-3 border-b border-surface-line py-4">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-icon text-label font-bold text-white"
                style={{ background: p.color ?? avatarColor(p.full_name) }}
              >
                {p.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-lg font-bold">{p.full_name}</span>
                <span className="block truncate text-body text-ink-2">{p.job_title}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </AjustesHeader>
  );
}