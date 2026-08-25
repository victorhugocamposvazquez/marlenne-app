import DayGrid from '@/components/agenda/DayGrid';
import WeekGrid from '@/components/agenda/WeekGrid';
import AgendaHeader from '@/components/agenda/AgendaHeader';
import AppointmentSheet from '@/components/agenda/AppointmentSheet';
import NewAppointmentSheet from '@/components/agenda/NewAppointmentSheet';
import WaitlistSheet from '@/components/agenda/WaitlistSheet';
import BlockSheet from '@/components/agenda/BlockSheet';
import { requireSession } from '@/lib/require-session';
import {
  listProviders, getDayAgenda, getWeekCounts, countWaitlist,
  listServices, listClientOptions, getAppointment, getAppointmentSms, listWaitlist,
} from '@/lib/queries';
import { dateFromOffset, dayKey } from '@/lib/time';
import { bestNameMatches } from '@/lib/voice';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { day?: string; mode?: string; new?: string; appt?: string; client?: string; wait?: string; close?: string; block?: string; bloqueo?: string; pro?: string; nombre?: string; hora?: string; servicio?: string };
}) {
  const parsed = Number(searchParams.day ?? 0);
  const day = Number.isFinite(parsed) ? parsed : 0;
  const mode = searchParams.mode === 'semana' ? 'semana' : 'dia';
  const [me, all] = await Promise.all([requireSession(), listProviders()]);
  // Una profesional solo ve su propia columna.
  const team = me.role === 'provider' ? all.filter(p => p.id === me.id) : all;
  const selectedPro = me.role === 'provider'
    ? me.id
    : (team.some(p => p.id === searchParams.pro) ? searchParams.pro : undefined);
  const providers = selectedPro ? team.filter(p => p.id === selectedPro) : team;
  const canMoveProvider = me.role !== 'provider';
  const canFilter = me.role !== 'provider';
  const sheetProviders = selectedPro
    ? [team.find(p => p.id === selectedPro)!, ...team.filter(p => p.id !== selectedPro)]
    : team;

  const opensNew = searchParams.new === '1';
  const opensWait = searchParams.wait === '1';
  const needsCatalog = opensNew || opensWait;
  const providerIds = providers.map(p => p.id);
  const [waiting, services, clients, appt, sms, waitItems, dayAgenda, weekDays] = await Promise.all([
    countWaitlist(),
    needsCatalog ? listServices() : Promise.resolve([]),
    needsCatalog ? listClientOptions() : Promise.resolve([]),
    searchParams.appt ? getAppointment(searchParams.appt) : Promise.resolve(null),
    searchParams.appt ? getAppointmentSms(searchParams.appt) : Promise.resolve(null),
    opensWait ? listWaitlist() : Promise.resolve([]),
    mode === 'dia'
      ? getDayAgenda(dateFromOffset(day), providerIds)
      : Promise.resolve({ appointments: [], blocks: [] }),
    mode === 'semana' ? getWeekCounts(providerIds, day) : Promise.resolve([]),
  ]);
  const existingBlock = searchParams.bloqueo
    ? dayAgenda.blocks.find(b => b.id === searchParams.bloqueo) ?? null
    : null;

  return (
    <div className="flex h-full flex-col">
      <AgendaHeader
        day={day}
        mode={mode}
        label={me.role === 'provider' ? 'Tu agenda' : selectedPro ? `Agenda de ${providers[0]?.full_name.split(' ')[0]}` : 'Agenda del centro'}
        waiting={waiting}
        providers={team}
        selectedPro={selectedPro}
        canFilter={canFilter}
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
          <WeekGrid days={weekDays} selectedPro={selectedPro} />
      )}

      {opensNew && (
        <NewAppointmentSheet
          day={dayKey(dateFromOffset(day))}
          providers={sheetProviders}
          services={services}
          clients={clients}
          preselected={
            clients.find(c => c.id === searchParams.client)
            ?? (searchParams.nombre ? bestNameMatches(clients, searchParams.nombre, c => c.full_name)[0] ?? null : null)
          }
          initialName={searchParams.nombre ?? ''}
          initialHora={searchParams.hora ?? ''}
          initialServiceQ={searchParams.servicio ?? ''}
        />
      )}

      {appt && (
        <AppointmentSheet
          appt={appt}
          providers={sheetProviders}
          canMoveProvider={canMoveProvider}
          startClosing={searchParams.close === '1'}
          sms={sms}
        />
      )}

      {opensWait && (
        <WaitlistSheet items={waitItems} clients={clients} services={services} />
      )}

      {(searchParams.block === '1' || existingBlock) && (
        <BlockSheet
          day={dayKey(dateFromOffset(day))}
          providers={sheetProviders}
          existing={existingBlock}
        />
      )}
    </div>
  );
}
