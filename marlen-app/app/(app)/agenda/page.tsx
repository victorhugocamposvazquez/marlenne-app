import DayGrid from '@/components/agenda/DayGrid';
import { PlaceProvider } from '@/components/agenda/PlaceContext';
import WeekGrid from '@/components/agenda/WeekGrid';
import AgendaHeader from '@/components/agenda/AgendaHeader';
import AppointmentSheetHost from '@/components/agenda/AppointmentSheetHost';
import NewAppointmentSheetHost from '@/components/agenda/NewAppointmentSheetHost';
import WaitlistSheetHost from '@/components/agenda/WaitlistSheetHost';
import BlockSheetHost from '@/components/agenda/BlockSheetHost';
import { requireSession } from '@/lib/require-session';
import { listStaff, getDayAgenda, getWeekCounts, getBusyOffsets, peekWaitlist } from '@/lib/queries';
import { agendaColumns } from '@/lib/team';
import { alignStripStart, dateFromOffset, dayKey } from '@/lib/time';
import { activeAppts } from '@/lib/week-view';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: {
    day?: string; mode?: string; new?: string; appt?: string; client?: string;
    wait?: string; close?: string; block?: string; bloqueo?: string; pro?: string;
    nombre?: string; hora?: string; servicio?: string; con?: string; strip?: string;
  };
}) {
  const parsed = Number(searchParams.day ?? 0);
  const day = Number.isFinite(parsed) ? parsed : 0;
  const stripParsed = Number(searchParams.strip ?? day);
  const strip = Number.isFinite(stripParsed) ? stripParsed : day;
  const mode = searchParams.mode === 'semana' ? 'semana' : 'dia';
  const [me, staff] = await Promise.all([requireSession(), listStaff()]);
  const all = agendaColumns(staff);
  // Una profesional solo ve su propia columna.
  const visible = me.role === 'provider' ? all.filter(p => p.id === me.id) : all;
  const team = visible.length > 0 ? visible : [{
    id: me.id,
    full_name: me.full_name,
    initials: me.initials,
    role: me.role,
    job_title: me.job_title,
    color: me.color,
  }];
  const selectedPro = me.role === 'provider'
    ? me.id
    : (team.some(p => p.id === searchParams.pro) ? searchParams.pro : undefined);
  const providers = selectedPro ? team.filter(p => p.id === selectedPro) : team;
  const canMoveProvider = me.role !== 'provider';
  const sheetProviders = selectedPro
    ? [team.find(p => p.id === selectedPro)!, ...team.filter(p => p.id !== selectedPro)]
    : team;

  const teamIds = team.map(p => p.id);
  const stripStart = alignStripStart(day, strip, 5);
  const [waitingPeek, dayAgenda, weekDays, stripBusy] = await Promise.all([
    peekWaitlist(),
    mode === 'dia'
      ? getDayAgenda(dateFromOffset(day), teamIds)
      : Promise.resolve({ appointments: [], blocks: [] }),
    mode === 'semana'
      ? getWeekCounts(providers.map(p => p.id), day)
      : Promise.resolve([]),
    mode === 'dia'
      ? getBusyOffsets(providers.map(p => p.id), stripStart - 90, 270)
      : Promise.resolve([]),
  ]);
  const dayStr = dayKey(dateFromOffset(day));
  const live = activeAppts(dayAgenda.appointments);
  const citas = live.length;

  return (
    <div className="relative flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <PlaceProvider>
      <AgendaHeader
        day={day}
        strip={strip}
        mode={mode}
        waiting={waitingPeek.count}
        citas={mode === 'dia' ? citas : undefined}
        busyOffsets={stripBusy}
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
      </PlaceProvider>
    </div>
  );
}
