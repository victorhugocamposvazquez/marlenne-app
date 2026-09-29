'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadAgendaBusyOffsets } from '@/app/actions/agenda-busy';
import {
  agendaBusyStripCount,
  agendaBusyStripStart,
} from '@/lib/agenda-busy-range';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import DayStrip from '@/components/agenda/DayStrip';
import MonthCalendar from '@/components/agenda/MonthCalendar';
import {
  HeaderIconButton, HeaderTitleRow, screenHeaderCls, screenTitleChevronCls, screenTitleCls,
} from '@/components/ui/ScreenHeader';
import { useAppShellMode } from '@/hooks/useAppShellMode';
import { pushOpenArmed } from '@/hooks/push-open';
import { shallowSet } from '@/hooks/useShallowQuery';
import { avatarColor } from '@/lib/categories';
import { providerShortLabel } from '@/lib/team';
import {
  alignStripStart,
  dateFromOffset,
  monthTitleFromOffset,
  skipSunday,
  weekMondayOffset,
  TZ,
} from '@/lib/time';
import type { Provider } from '@/lib/types';

function wideTitle(day: number, mode: 'dia' | 'semana') {
  if (mode === 'semana') {
    const mon = weekMondayOffset(day);
    const d = dateFromOffset(mon);
    const label = d.toLocaleDateString('es-ES', { timeZone: TZ, day: 'numeric', month: 'short' });
    return `Semana del ${label.replace('.', '')}`;
  }
  if (day === 0) {
    const d = dateFromOffset(0);
    const label = d.toLocaleDateString('es-ES', { timeZone: TZ, day: 'numeric', month: 'short' });
    return `Hoy, ${label.replace('.', '')}`;
  }
  const d = dateFromOffset(day);
  const weekday = d.toLocaleDateString('es-ES', { timeZone: TZ, weekday: 'long' });
  const rest = d.toLocaleDateString('es-ES', { timeZone: TZ, day: 'numeric', month: 'short' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${rest.replace('.', '')}`;
}

export default function AgendaHeader({
  day, strip, mode, waiting, citas, busyOffsets = [], busyProviderIds = [],
  team = [], selectedPro,
}: {
  day: number;
  strip: number;
  mode: 'dia' | 'semana';
  waiting: number;
  citas?: number;
  busyOffsets?: number[];
  busyProviderIds?: string[];
  team?: Provider[];
  selectedPro?: string | null;
}) {
  const router = useRouter();
  const shell = useAppShellMode();
  const wide = shell === 'wide';
  const [cal, setCal] = useState(false);
  const start = alignStripStart(day, strip, 5);
  const [busy, setBusy] = useState(busyOffsets);

  useEffect(() => {
    setBusy(busyOffsets);
  }, [busyOffsets]);

  const stripBusyKey = useMemo(
    () => `${day}:${start}:${busyProviderIds.join(',')}`,
    [day, start, busyProviderIds],
  );

  useEffect(() => {
    if (mode !== 'dia' || busyProviderIds.length === 0) return;
    let alive = true;
    const from = agendaBusyStripStart(day, start);
    const count = agendaBusyStripCount(day, start);
    void loadAgendaBusyOffsets(busyProviderIds, from, count).then(extra => {
      if (!alive || !extra.length) return;
      setBusy(prev => [...new Set([...prev, ...extra])]);
    });
    return () => { alive = false; };
  }, [mode, stripBusyKey, day, start, busyProviderIds]);

  const go = (d: number, extra?: { strip?: number; mode?: string; pro?: string | null }) => {
    if (pushOpenArmed()) return;
    const q = new URLSearchParams();
    q.set('day', String(d));
    q.set('mode', extra?.mode ?? mode);
    q.set('strip', String(extra?.strip ?? start));
    const pro = extra?.pro !== undefined ? extra.pro : selectedPro;
    if (pro) q.set('pro', pro);
    if (typeof window !== 'undefined') {
      const live = new URLSearchParams(window.location.search);
      for (const k of ['new', 'client', 'nombre', 'hora', 'servicio', 'con', 'appt', 'close']) {
        const v = live.get(k);
        if (v) q.set(k, v);
      }
    }
    router.push(`/agenda?${q.toString()}`);
  };

  const openNew = () => {
    if (pushOpenArmed()) return;
    shallowSet({
      new: '1',
      con: selectedPro ?? null,
      hora: null, nombre: null, servicio: null, client: null,
      wait: null, block: null, bloqueo: null, appt: null, close: null, alta: null, miembro: null,
    });
  };

  const prevDay = () => {
    if (mode === 'semana') go(day - 7);
    else go(skipSunday(day - 1, -1));
  };
  const nextDay = () => {
    if (mode === 'semana') go(day + 7);
    else go(skipSunday(day + 1, 1));
  };

  if (wide) {
    return (
      <header className="shrink-0 border-b border-surface-line bg-white px-6 pb-3.5 pt-[18px]">
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Anterior" onClick={prevDay} className="grid h-[38px] w-[38px] place-items-center rounded-pill bg-track">
              <ChevronLeft size={16} strokeWidth={2.6} />
            </button>
            <button type="button" aria-label="Siguiente" onClick={nextDay} className="grid h-[38px] w-[38px] place-items-center rounded-pill bg-track">
              <ChevronRight size={16} strokeWidth={2.6} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCal(true)}
            className="flex items-center gap-2 border-0 bg-transparent p-0 text-ink"
          >
            <span className="whitespace-nowrap text-[21px] font-extrabold tracking-[-.02em]">
              {wideTitle(day, mode)}
            </span>
            <ChevronDown size={15} strokeWidth={2.8} aria-hidden />
          </button>

          {day !== 0 && mode === 'dia' && (
            <button
              type="button"
              onClick={() => go(0, { strip: 0 })}
              className="h-[34px] rounded-pill px-3.5 text-[13.5px] font-bold text-v"
            >
              Hoy
            </button>
          )}

          <div className="flex-1" />

          <div className="flex rounded-pill bg-track p-[3px]">
            {(['dia', 'semana'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => go(day, { mode: m, pro: m === 'semana' ? (selectedPro ?? team[0]?.id ?? null) : selectedPro })}
                className={`h-9 rounded-pill px-[18px] text-[13.5px] font-bold ${
                  mode === m ? 'bg-ink text-white' : 'text-ink-2'
                }`}
              >
                {m === 'dia' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openNew}
            className="flex h-[42px] items-center gap-2 rounded-pill bg-grad px-[18px] text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(208,0,168,.25)]"
          >
            <Plus size={16} strokeWidth={2.8} />
            Nueva cita
          </button>
        </div>

        {mode === 'semana' && team.length > 1 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {team.map(p => {
              const active = (selectedPro ?? team[0]?.id) === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => go(day, { mode: 'semana', pro: p.id })}
                  className={`flex h-10 items-center gap-2 rounded-pill py-0 pl-1.5 pr-3.5 text-[13.5px] font-bold ${
                    active
                      ? 'border-2 border-ink bg-white text-ink'
                      : 'border-[1.5px] border-surface-line bg-white text-ink'
                  }`}
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full text-[10.5px] font-bold text-white"
                    style={{ background: p.color ?? avatarColor(p.full_name) }}
                  >
                    {(p.initials ?? providerShortLabel(p.full_name).slice(0, 1)).slice(0, 2)}
                  </span>
                  {providerShortLabel(p.full_name)}
                </button>
              );
            })}
          </div>
        )}

        {cal && (
          <MonthCalendar
            selectedOffset={day}
            onClose={() => setCal(false)}
            onSelect={offset => go(offset, { strip: offset })}
            centered
          />
        )}
      </header>
    );
  }

  return (
    <header className={screenHeaderCls}>
      <HeaderTitleRow
        title={(
          <button
            type="button"
            onClick={() => setCal(true)}
            className={`flex min-w-0 max-w-full items-center gap-[0.15em] text-left ${screenTitleCls}`}
          >
            <span className="whitespace-nowrap">{monthTitleFromOffset(day)}</span>
            <ChevronDown strokeWidth={2.6} className={screenTitleChevronCls} aria-hidden />
          </button>
        )}
        actions={(
          <>
            <HeaderIconButton label="Calendario" onClick={() => setCal(true)}>
              <Calendar strokeWidth={2} />
            </HeaderIconButton>
            <HeaderIconButton label="Nueva cita" onClick={openNew}>
              <Plus strokeWidth={2.2} />
            </HeaderIconButton>
          </>
        )}
      />

      <div className="mt-2 flex rounded-pill bg-track p-0.5 self-start">
        {(['dia', 'semana'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => go(day, { mode: m })}
            className={`h-8 rounded-pill px-3.5 text-[12.5px] font-bold ${
              mode === m ? 'bg-ink text-white' : 'text-ink-2'
            }`}
          >
            {m === 'dia' ? 'Día' : 'Semana'}
          </button>
        ))}
      </div>

      {mode === 'dia' && (
        <>
          <div className="mt-1.5 w-full">
            <DayStrip
              selectedOffset={day}
              startOffset={start}
              busyOffsets={busy}
              onSelect={offset => go(skipSunday(offset, 1))}
            />
          </div>
          <div className="mt-2 flex min-h-[18px] flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-label">
            {citas != null && (
              <span className="shrink-0 text-ink-3">
                {citas === 0 ? 'Sin citas' : `${citas} ${citas === 1 ? 'cita' : 'citas'}`}
              </span>
            )}
            {citas != null && (
              <span className="text-ink-3/40" aria-hidden>·</span>
            )}
            <button
              type="button"
              disabled={day === 0}
              onClick={() => go(0, { strip: 0 })}
              className={`inline-flex shrink-0 items-center gap-0.5 font-semibold text-v-2 ${
                day === 0 ? 'pointer-events-none opacity-35' : ''
              }`}
            >
              Ir a hoy
              <ChevronRight size={13} strokeWidth={2.6} className="opacity-60" aria-hidden />
            </button>
            {waiting > 0 && (
              <>
                <span className="text-ink-3/40" aria-hidden>·</span>
                <button
                  type="button"
                  onClick={() => shallowSet({ wait: '1', new: null, appt: null })}
                  className="inline-flex shrink-0 items-center gap-0.5 font-bold text-v-d"
                >
                  {waiting} en espera
                  <ChevronRight size={13} strokeWidth={2.6} className="opacity-50" aria-hidden />
                </button>
              </>
            )}
          </div>
        </>
      )}

      {cal && (
        <MonthCalendar
          selectedOffset={day}
          onClose={() => setCal(false)}
          onSelect={offset => go(offset, { strip: offset })}
        />
      )}
    </header>
  );
}
