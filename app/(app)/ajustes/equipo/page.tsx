import { requireSession } from '@/lib/require-session';
import { listStaff } from '@/lib/queries';
import { avatarColor } from '@/lib/categories';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import TeamEditor from '@/components/TeamEditor';

export default async function EquipoPage() {
  const me = await requireSession();
  const team = await listStaff({ includeInactive: me.role === 'admin' });

  return (
    <AjustesHeader title="Equipo">
      {me.role === 'admin' ? (
        <TeamEditor team={team} meId={me.id} heading={false} />
      ) : (
        <div className="flex flex-col gap-2">
          {team.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-row border border-surface-line bg-surface-card p-3 shadow-card">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-icon text-label font-bold text-white"
                style={{ background: p.color ?? avatarColor(p.full_name) }}
              >
                {p.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-bold">{p.full_name}</span>
                <span className="block truncate text-caption font-medium text-ink-2">{p.job_title}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </AjustesHeader>
  );
}