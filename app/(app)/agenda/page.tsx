import DayGrid from '@/components/agenda/DayGrid';
import WeekGrid from '@/components/agenda/WeekGrid';
import AgendaHeader from '@/components/agenda/AgendaHeader';
import AppointmentSheet from '@/components/agenda/AppointmentSheet';
import NewAppointmentSheet from '@/components/agenda/NewAppointmentSheet';
import {
  requireSession, listProviders, getDayAgenda, getWeekCounts, countWaitlist,
  listServices, listClientOptions, getAppointment,
} from '@/lib/queries';
import { dateFromOffset, dayKey } from '@/lib/time';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { day?: string; mode?: string; new?: string; appt?: string; client?: string };
}) {
  const parsed = Number(searchParams.day ?? 0);
  const day = Number.isFinite(parsed) ? parsed : 0;
  const mode = searchParams.mode === 'semana' ? 'semana' : 'dia';
  const me = await requireSession();

  const all = await listProviders();
  // Una profesional solo ve su propia columna.
  const providers = me.role === 'provider' ? all.filter(p => p.id === me.id) : all;
  const canMoveProvider = me.role !== 'provider';

  const opensNew = searchParams.new === '1';
  const [waiting, services, clients, appt] = await Promise.all([
    countWaitlist(),
    opensNew ? listServices() : Promise.resolve([]),
    opensNew ? listClientOptions() : Promise.resolve([]),
    searchParams.appt ? getAppointment(searchParams.appt) : Promise.resolve(null),
  ]);

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
          canMoveProvider={canMoveProvider}
        />
      ) : (
        <WeekGrid days={await getWeekCounts(providers.map(p => p.id))} />
      )}

      {opensNew && (
        <NewAppointmentSheet
          day={dayKey(dateFromOffset(day))}
          providers={providers}
          services={services}
          clients={clients}
          preselected={clients.find(c => c.id === searchParams.client) ?? null}
        />
      )}

      {appt && (
        <AppointmentSheet appt={appt} providers={providers} canMoveProvider={canMoveProvider} />
      )}
    </div>
  );
}
