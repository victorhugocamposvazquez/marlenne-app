'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import TeamEditor from '@/components/TeamEditor';
import EquipoHeaderAction from '@/components/team/EquipoHeaderAction';
import PageHeading from '@/components/ui/PageHeading';
import { screenHeaderCls } from '@/components/ui/ScreenHeader';
import { avatarColor } from '@/lib/categories';
import type { Provider } from '@/lib/types';

function teamSubtitle(team: Provider[]) {
  const active = team.filter(p => p.is_active !== false).length;
  if (team.length === active) {
    return `${team.length} ${team.length === 1 ? 'persona' : 'personas'}`;
  }
  return `${active} activas · ${team.length} en total`;
}

export default function EquipoView({
  team, meId, initialMiembro, admin,
}: {
  team: Provider[];
  meId: string;
  initialMiembro?: boolean;
  admin: boolean;
}) {
  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <header className={screenHeaderCls}>
        <PageHeading
          kicker={(
            <Link
              href="/ajustes"
              className="inline-flex items-center gap-0.5 text-body font-semibold text-ink-2"
            >
              <ChevronLeft size={16} strokeWidth={2.4} aria-hidden />
              Ajustes
            </Link>
          )}
          title="Equipo"
          subtitle={teamSubtitle(team)}
        >
          {admin && <EquipoHeaderAction />}
        </PageHeading>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-fab pt-1">
        {admin ? (
          <TeamEditor team={team} meId={meId} initialMiembro={initialMiembro} />
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
      </div>
    </div>
  );
}
