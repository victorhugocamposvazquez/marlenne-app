import DayGrid from '@/components/agenda/DayGrid';
import WeekGrid from '@/components/agenda/WeekGrid';
import AgendaHeader from '@/components/agenda/AgendaHeader';
import AppointmentSheetHost from '@/components/agenda/AppointmentSheetHost';
import NewAppointmentSheetHost from '@/components/agenda/NewAppointmentSheetHost';
import WaitlistSheetHost from '@/components/agenda/WaitlistSheetHost';
import BlockSheetHost from '@/components/agenda/BlockSheetHost';
import { requireSession } from '@/lib/require-session';
import { listProviders, getDayAgenda, getWeekCounts, countWaitlist } from '@/lib/queries';
import { dateFromOffset, dayKey } from '@/lib/time';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: {
    day?: string; mode?: string; new?: string; appt?: string; client?: string;
    wait?: string; close?: string; block?: string; bloqueo?: string; pro?: string;
    nombre?: string; hora?: string; servicio?: string; con?: string;
  };
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

  const teamIds = team.map(p => p.id);
  const [waiting, dayAgenda, weekDays] = await Promise.all([
    countWaitlist(),
    mode === 'dia'
      ? getDayAgenda(dateFromOffset(day), teamIds)
      : Promise.resolve({ appointments: [], blocks: [] }),
    mode === 'semana' ? getWeekCounts(providers.map(p => p.id), day) : Promise.resolve([]),
  ]);
  const dayStr = dayKey(dateFromOffset(day));

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
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
          providers={team}
          appointments={dayAgenda.appointments}
          blocks={dayAgenda.blocks}
          canMoveProvider={canMoveProvider}
          selectedPro={selectedPro}
        />
      ) : (
        <WeekGrid days={weekDays} selectedPro={selectedPro} providerCount={providers.length} />
      )}

      <NewAppointmentSheetHost
        day={dayStr}
        providers={sheetProviders}
        initialOpen={searchParams.new === '1'}
        initialClient={searchParams.client}
        initialNombre={searchParams.nombre}
        initialHora={searchParams.hora}
        initialServicio={searchParams.servicio}
        initialCon={searchParams.con}
      />

      <AppointmentSheetHost
        appointments={dayAgenda.appointments}
        providers={sheetProviders}
        canMoveProvider={canMoveProvider}
        initialId={searchParams.appt}
        startClosing={searchParams.close === '1'}
      />

      <WaitlistSheetHost initialOpen={searchParams.wait === '1'} />

      <BlockSheetHost
        day={dayStr}
        providers={sheetProviders}
        blocks={dayAgenda.blocks}
        initialBlock={searchParams.block === '1'}
        initialBloqueo={searchParams.bloqueo}
      />
    </div>
  );
}
