import AgendaBody from '@/components/agenda/AgendaBody';
import { PlaceProvider } from '@/components/agenda/PlaceContext';
import AgendaHeader from '@/components/agenda/AgendaHeader';
import AppointmentSheetHost from '@/components/agenda/AppointmentSheetHost';
import NewAppointmentSheetHost from '@/components/agenda/NewAppointmentSheetHost';
import WaitlistSheetHost from '@/components/agenda/WaitlistSheetHost';
import BlockSheetHost from '@/components/agenda/BlockSheetHost';
import { requireCompany } from '@/lib/require-session';
import { listStaff, getDayAgenda, getWeekCounts, getBusyOffsets, peekWaitlist, getSalonAgendaFeatures } from '@/lib/queries';
import { agendaColumns } from '@/lib/team';
import {
  agendaBusyInitialCount,
  agendaBusyInitialStart,
} from '@/lib/agenda-busy-range';
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
  const [me, staff] = await Promise.all([requireCompany(), listStaff()]);
  const features = await getSalonAgendaFeatures(me.salon_id);
  const all = agendaColumns(staff);
  const visible = me.role === 'provider' ? all.filter(p => p.id === me.id) : all;
  const team = visible.length > 0 ? visible : [{
    id: me.id,
    full_name: me.full_name,
    initials: me.initials,
    role: me.role,
    job_title: me.job_title,
    color: me.color,
  }];

  // Semana = un profesional (como el diseño). Día = columnas del equipo.
  const selectedPro = me.role === 'provider'
    ? me.id
    : (team.some(p => p.id === searchParams.pro)
      ? searchParams.pro
      : (mode === 'semana' ? team[0]?.id : undefined));

  const providers = selectedPro ? team.filter(p => p.id === selectedPro) : team;
  const canMoveProvider = me.role !== 'provider';
  const sheetProviders = selectedPro
    ? [team.find(p => p.id === selectedPro)!, ...team.filter(p => p.id !== selectedPro)]
    : team;

  const teamIds = team.map(p => p.id);
  const stripStart = alignStripStart(day, strip, 5);
  const busyProviderIds = providers.map(p => p.id);
  const weekProIds = selectedPro ? [selectedPro] : busyProviderIds;

  const [waitingPeek, dayAgenda, weekDays, stripBusy] = await Promise.all([
    peekWaitlist(),
    mode === 'dia'
      ? getDayAgenda(dateFromOffset(day), teamIds)
      : Promise.resolve({ appointments: [], blocks: [] }),
    mode === 'semana'
      ? getWeekCounts(weekProIds, day)
      : Promise.resolve([]),
    mode === 'dia'
      ? getBusyOffsets(busyProviderIds, agendaBusyInitialStart(day), agendaBusyInitialCount())
      : Promise.resolve([]),
  ]);
  const dayStr = dayKey(dateFromOffset(day));
  const live = activeAppts(dayAgenda.appointments);
  const citas = live.length;

  return (
    <div className="relative flex h-0 min-h-0 flex-1 flex-col overflow-hidden bg-surface-soft">
      <PlaceProvider>
      <AgendaHeader
        day={day}
        strip={strip}
        mode={mode}
        waiting={waitingPeek.count}
        citas={mode === 'dia' ? citas : undefined}
        busyOffsets={stripBusy}
        busyProviderIds={mode === 'dia' ? busyProviderIds : []}
        team={team}
        selectedPro={selectedPro}
      />
      <AgendaBody
        mode={mode}
        dateIso={dateFromOffset(day).toISOString()}
        team={mode === 'dia' ? team : providers}
        appointments={dayAgenda.appointments}
        blocks={dayAgenda.blocks}
        canMoveProvider={canMoveProvider}
        selectedPro={selectedPro}
        weekDays={weekDays}
        weekProviderCount={providers.length}
      />

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
        showPayment={features.apptPayment}
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
