import DayGrid from '@/components/agenda/DayGrid';
import WeekGrid from '@/components/agenda/WeekGrid';
import AgendaHeader from '@/components/agenda/AgendaHeader';
import { getSession, listProviders, getDayAgenda, getWeekCounts, countWaitlist } from '@/lib/queries';
import { dateFromOffset } from '@/lib/time';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { day?: string; mode?: string };
}) {
  const day = Number(searchParams.day ?? 0);
  const mode = searchParams.mode === 'semana' ? 'semana' : 'dia';
  const me = (await getSession())!;

  const all = await listProviders();
  // Una profesional solo ve su propia columna.
  const providers = me.role === 'provider' ? all.filter(p => p.id === me.id) : all;

  const waiting = await countWaitlist();

  return (
    <div className="flex h-full flex-col">
      <AgendaHeader
        day={day}
        mode={mode}
        label={me.role === 'provider' ? 'Tu agenda' : 'Agenda del centro'}
        waiting={waiting}
      />
      {mode === 'dia' ? (
        <DayGrid
          date={dateFromOffset(day).toISOString()}
          providers={providers}
          {...(await getDayAgenda(dateFromOffset(day), providers.map(p => p.id)))}
          canMoveProvider={me.role !== 'provider'}
        />
      ) : (
        <WeekGrid days={await getWeekCounts(providers.map(p => p.id))} />
      )}
    </div>
  );
}
