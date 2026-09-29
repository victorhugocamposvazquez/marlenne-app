'use client';

import DayGrid from '@/components/agenda/DayGrid';
import WeekGrid from '@/components/agenda/WeekGrid';
import WeekTimeline from '@/components/agenda/WeekTimeline';
import { useAppShellMode } from '@/hooks/useAppShellMode';
import type { AgendaAppt, AgendaBlock, Provider, WeekDay } from '@/lib/types';

export default function AgendaBody({
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

  if (mode === 'dia') {
    return (
      <DayGrid
        date={dateIso}
        providers={team}
        appointments={appointments}
        blocks={blocks}
        canMoveProvider={canMoveProvider}
        selectedPro={selectedPro}
      />
    );
  }

  if (wide) {
    return <WeekTimeline days={weekDays} selectedPro={selectedPro} />;
  }

  return (
    <WeekGrid
      days={weekDays}
      selectedPro={selectedPro}
      providerCount={weekProviderCount}
    />
  );
}
