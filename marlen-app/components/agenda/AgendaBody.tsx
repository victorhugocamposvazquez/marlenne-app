'use client';

import AgendaWeekCarousel from '@/components/agenda/AgendaWeekCarousel';
import DayGrid from '@/components/agenda/DayGrid';
import WeekGrid from '@/components/agenda/WeekGrid';
import WeekTimeline from '@/components/agenda/WeekTimeline';
import { useAppShellMode } from '@/hooks/useAppShellMode';
import type { AgendaAppt, AgendaBlock, Provider, WeekDay } from '@/lib/types';

export default function AgendaBody({
  day,
  mode,
  dateIso,
  team,
  appointments,
  blocks,
  canMoveProvider,
  selectedPro,
  weekDays,
  weekProviderCount,
}: {
  day: number;
  mode: 'dia' | 'semana';
  dateIso: string;
  team: Provider[];
  appointments: AgendaAppt[];
  blocks: AgendaBlock[];
  canMoveProvider: boolean;
  selectedPro?: string | null;
  weekDays: WeekDay[];
  weekProviderCount: number;
}) {
  const wide = useAppShellMode() === 'wide';

  const body =
    mode === 'dia' ? (
      <DayGrid
        date={dateIso}
        providers={team}
        appointments={appointments}
        blocks={blocks}
        canMoveProvider={canMoveProvider}
        selectedPro={selectedPro}
      />
    ) : wide ? (
      <WeekTimeline days={weekDays} selectedPro={selectedPro} />
    ) : (
      <WeekGrid
        days={weekDays}
        selectedPro={selectedPro}
        providerCount={weekProviderCount}
      />
    );

  return <AgendaWeekCarousel day={day}>{body}</AgendaWeekCarousel>;
}
