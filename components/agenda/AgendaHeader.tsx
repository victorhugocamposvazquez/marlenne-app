'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import DayStrip from '@/components/agenda/DayStrip';
import MonthCalendar from '@/components/agenda/MonthCalendar';
import {
  HeaderIconButton, HeaderTitleRow, screenHeaderCls, screenTitleChevronCls, screenTitleCls,
} from '@/components/ui/ScreenHeader';
import { alignStripStart, monthTitleFromOffset, skipSunday } from '@/lib/time';
import { shallowSet } from '@/hooks/useShallowQuery';

export default function AgendaHeader({
  day, strip, mode, waiting, citas, busyOffsets = [],
}: {
  day: number;
  strip: number;
  mode: 'dia' | 'semana';
  waiting: number;
  citas?: number;
  busyOffsets?: number[];
}) {
  const router = useRouter();
  const [cal, setCal] = useState(false);
  const start = alignStripStart(day, strip, 5);

  const go = (d: number, extra?: { strip?: number; mode?: string }) => {
    const q = new URLSearchParams();
    q.set('day', String(d));
    q.set('mode', extra?.mode ?? mode);
    q.set('strip', String(extra?.strip ?? start));
    if (typeof window !== 'undefined') {
      const live = new URLSearchParams(window.location.search);
      for (const k of ['new', 'client', 'nombre', 'hora', 'servicio', 'con']) {
        const v = live.get(k);
        if (v) q.set(k, v);
      }
    }
    router.push(`/agenda?${q.toString()}`);
  };

  const openNew = () => {
    shallowSet({
      new: '1',
      con: null, hora: null, nombre: null, servicio: null, client: null,
      wait: null, block: null, bloqueo: null, appt: null, close: null, alta: null, miembro: null,
    });
  };

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
              <Calendar size={22} strokeWidth={2} />
            </HeaderIconButton>
            <HeaderIconButton label="Nueva cita" onClick={openNew}>
              <Plus size={22} strokeWidth={2.2} />
            </HeaderIconButton>
          </>
        )}
      />

      {mode === 'dia' && (
        <>
          <div className="mt-1">
            <DayStrip
              selectedOffset={day}
              startOffset={start}
              busyOffsets={busyOffsets}
              onSelect={offset => go(skipSunday(offset, 1))}
              onPage={delta => go(day, { strip: start + delta })}
            />
          </div>
          <div className="mt-2 flex min-h-[18px] flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-label">
            {citas != null && (
              <span className="shrink-0 text-ink-3">
                {citas === 0 ? 'Sin citas' : `${citas} ${citas === 1 ? 'cita' : 'citas'}`}
              </span>
            )}
            {day !== 0 && (
              <>
                {citas != null && (
                  <span className="text-ink-3/40" aria-hidden>·</span>
                )}
                <button
                  type="button"
                  onClick={() => go(0, { strip: 0 })}
                  className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-v-2"
                >
                  Ir a hoy
                  <ChevronRight size={13} strokeWidth={2.6} className="opacity-60" aria-hidden />
                </button>
              </>
            )}
            {waiting > 0 && (
              <>
                {(citas != null || day !== 0) && (
                  <span className="text-ink-3/40" aria-hidden>·</span>
                )}
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
