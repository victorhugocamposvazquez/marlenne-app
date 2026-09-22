'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import EquipoAdminView from '@/components/catalog/EquipoAdminView';
import EquipoHeaderAction from '@/components/team/EquipoHeaderAction';
import { CatalogGroupCard } from '@/components/catalog/catalog-ui';
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
          <EquipoAdminView team={team} meId={meId} initialMiembro={initialMiembro} />
        ) : (
          <div className="mt-4 pb-2">
            <CatalogGroupCard>
              {team.map(p => (
                <div key={p.id} className="flex items-center gap-3 border-t border-surface-line px-3.5 py-3.5 first:border-t-0">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-icon text-label font-bold text-white"
                    style={{ background: p.color ?? avatarColor(p.full_name) }}
                  >
                    {p.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-ink">{p.full_name}</span>
                    <span className="block truncate text-label font-medium text-ink-2">{p.job_title}</span>
                  </span>
                </div>
              ))}
            </CatalogGroupCard>
          </div>
        )}
      </div>
    </div>
  );
}
