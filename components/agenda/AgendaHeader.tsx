'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronDown, X } from 'lucide-react';
import DayStrip from '@/components/agenda/DayStrip';
import MonthCalendar from '@/components/agenda/MonthCalendar';
import { avatarColor, initials } from '@/lib/categories';
import { alignStripStart, monthTitleFromOffset, skipSunday } from '@/lib/time';
import { shallowSet } from '@/hooks/useShallowQuery';
import type { ClientOption } from '@/lib/types';

export default function AgendaHeader({
  day, strip, mode, waiting, citas, busyOffsets = [], forClient, forHint,
}: {
  day: number;
  strip: number;
  mode: 'dia' | 'semana';
  waiting: number;
  citas?: number;
  busyOffsets?: number[];
  forClient?: ClientOption | null;
  forHint?: string;
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
      for (const k of ['new', 'client', 'nombre', 'hora', 'servicio', 'con', 'para']) {
        const v = live.get(k);
        if (v) q.set(k, v);
      }
    }
    router.push(`/agenda?${q.toString()}`);
  };

  return (
    <header className="shrink-0 px-4 pb-0 pt-5">
      <div className="mb-3 flex items-center justify-between px-1">
        <button type="button" onClick={() => setCal(true)} className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="text-title font-bold tracking-[-.02em]">{monthTitleFromOffset(day)}</span>
            <ChevronDown size={16} strokeWidth={2.8} />
          </span>
          <span className="grid h-11 w-11 place-items-center rounded-pill bg-ink text-white">
            <Calendar size={20} strokeWidth={2.2} />
          </span>
        </button>
        <div className="flex items-center gap-3">
          {day !== 0 && (
            <button type="button" onClick={() => go(0, { strip: 0 })} className="text-[14px] font-semibold text-v-d">
              Hoy
            </button>
          )}
          <button
            type="button"
            onClick={() => go(day, { mode: mode === 'semana' ? 'dia' : 'semana' })}
            className="text-[13px] font-semibold text-ink-3"
          >
            {mode === 'semana' ? 'Día' : 'Semana'}
          </button>
        </div>
      </div>

      {mode === 'dia' && (
        <DayStrip
          selectedOffset={day}
          startOffset={start}
          busyOffsets={busyOffsets}
          onSelect={offset => go(skipSunday(offset, 1))}
          onShift={delta => {
            const next = start + delta;
            go(skipSunday(next, 1), { strip: next });
          }}
        />
      )}

      {forClient && (
        <div className="mt-3.5 flex items-center gap-3 rounded-[18px] border border-[rgba(208,0,168,.25)] bg-[linear-gradient(90deg,rgba(255,36,85,.08),rgba(208,0,168,.08),rgba(8,121,255,.08))] px-3.5 py-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
            style={{ background: avatarColor(forClient.full_name) }}
          >
            {initials(forClient.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">Cita para {forClient.full_name}</p>
            <p className="truncate text-label text-ink-2">{forHint ?? 'Toca un hueco libre del día'}</p>
          </div>
          <button
            type="button"
            aria-label="Cancelar"
            onClick={() => shallowSet({ para: null, client: null, nombre: null, servicio: null })}
            className="grid h-8 w-8 place-items-center rounded-full bg-white"
          >
            <X size={14} strokeWidth={2.6} />
          </button>
        </div>
      )}

      {waiting > 0 && (
        <button
          type="button"
          onClick={() => shallowSet({ wait: '1', new: null, appt: null })}
          className="mt-3 text-[13px] font-bold text-v-d"
        >
          {waiting} en espera
        </button>
      )}

      {mode === 'dia' && citas != null && !forClient && (
        <p className="mt-3 px-1 text-label text-ink-3">
          {citas === 0 ? 'Sin citas' : `${citas} ${citas === 1 ? 'cita' : 'citas'}`}
        </p>
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
