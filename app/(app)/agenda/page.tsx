import DayGrid from '@/components/agenda/DayGrid';
import WeekGrid from '@/components/agenda/WeekGrid';
import AgendaHeader from '@/components/agenda/AgendaHeader';
import AppointmentSheet from '@/components/agenda/AppointmentSheet';
import NewAppointmentSheet from '@/components/agenda/NewAppointmentSheet';
import WaitlistSheet from '@/components/agenda/WaitlistSheet';
import BlockSheet from '@/components/agenda/BlockSheet';
import {
  requireSession, listProviders, getDayAgenda, getWeekCounts, countWaitlist,
  listServices, listClientOptions, getAppointment, listWaitlist,
} from '@/lib/queries';
import { dateFromOffset, dayKey } from '@/lib/time';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { day?: string; mode?: string; new?: string; appt?: string; client?: string; wait?: string; close?: string; block?: string; bloqueo?: string };
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
  const opensWait = searchParams.wait === '1';
  const needsCatalog = opensNew || opensWait;
  const [waiting, services, clients, appt, waitItems, dayAgenda] = await Promise.all([
    countWaitlist(),
    needsCatalog ? listServices() : Promise.resolve([]),
    needsCatalog ? listClientOptions() : Promise.resolve([]),
    searchParams.appt ? getAppointment(searchParams.appt) : Promise.resolve(null),
    opensWait ? listWaitlist() : Promise.resolve([]),
    mode === 'dia'
      ? getDayAgenda(dateFromOffset(day), providers.map(p => p.id))
      : Promise.resolve({ appointments: [], blocks: [] }),
  ]);
  const existingBlock = searchParams.bloqueo
    ? dayAgenda.blocks.find(b => b.id === searchParams.bloqueo) ?? null
    : null;

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
          appointments={dayAgenda.appointments}
          blocks={dayAgenda.blocks}
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
        <AppointmentSheet
          appt={appt}
          providers={providers}
          canMoveProvider={canMoveProvider}
          startClosing={searchParams.close === '1'}
        />
      )}

      {opensWait && (
        <WaitlistSheet items={waitItems} clients={clients} services={services} />
      )}

      {(searchParams.block === '1' || existingBlock) && (
        <BlockSheet
          day={dayKey(dateFromOffset(day))}
          providers={providers}
          existing={existingBlock}
        />
      )}
    </div>
  );
}
