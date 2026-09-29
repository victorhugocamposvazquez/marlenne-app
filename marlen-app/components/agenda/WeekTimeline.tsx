'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { catStyle, softAccent } from '@/lib/categories';
import { DAY_END, DAY_START, fmt, minutesOfDay, nowMinutes } from '@/lib/time';
import type { WeekDay } from '@/lib/types';
import { activeAppts } from '@/lib/week-view';
import { shallowSet } from '@/hooks/useShallowQuery';
import LiveRefresh from '@/components/LiveRefresh';

const SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const;
const HOUR_W = 52;
const HOUR_H = 88;

/** Timeline de 7 días (vista Semana en tablet/escritorio). */
export default function WeekTimeline({
  days,
  selectedPro,
}: {
  days: WeekDay[];
  selectedPro?: string | null;
}) {
  const router = useRouter();
  const [now, setNow] = useState(nowMinutes);
  const pxPerMin = HOUR_H / 60;
  const gridH = (DAY_END - DAY_START) * pxPerMin;
  const hours: { label: string; top: number }[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) {
    hours.push({ label: fmt(m), top: (m - DAY_START) * pxPerMin });
  }

  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(t);
  }, []);

  const openDay = (offset: number) => {
    const q = new URLSearchParams({ day: String(offset), mode: 'dia' });
    if (selectedPro) q.set('pro', selectedPro);
    router.push(`/agenda?${q.toString()}`);
  };

  const openEmpty = (offset: number, clientY: number, el: HTMLElement) => {
    const y = clientY - el.getBoundingClientRect().top;
    const snapped = Math.round((DAY_START + y / pxPerMin) / 15) * 15;
    const start = Math.max(DAY_START, Math.min(DAY_END - 15, snapped));
    const hora = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    const q = new URLSearchParams(window.location.search);
    q.set('day', String(offset));
    q.set('mode', 'semana');
    if (selectedPro) q.set('pro', selectedPro);
    window.history.replaceState(null, '', `/agenda?${q.toString()}`);
    shallowSet({
      new: '1',
      con: selectedPro ?? null,
      hora,
      appt: null,
      wait: null,
      block: null,
      bloqueo: null,
    });
  };

  const showNow = days.some(d => d.isToday) && now >= DAY_START && now <= DAY_END;

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden pl-6">
      <LiveRefresh tables={['appointments']} />
      <div className="flex shrink-0 pr-6" style={{ paddingLeft: HOUR_W }}>
        {days.map((d, i) => {
          const n = activeAppts(d.appointments).length;
          return (
            <button
              key={d.offset}
              type="button"
              onClick={() => openDay(d.offset)}
              className={`flex min-w-0 flex-1 items-center gap-2 border-b-2 pb-2.5 pl-2.5 text-left ${
                d.isToday ? 'border-ink' : 'border-[#D9D8E0]'
              }`}
            >
              <span
                className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                  d.isToday ? 'bg-ink text-white' : 'text-ink'
                }`}
              >
                {d.num}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold tracking-[.05em] text-ink-3">
                  {SHORT[i]}
                </span>
                <span className="block truncate text-[11.5px] text-ink-3">
                  {n ? `${n} cita${n > 1 ? 's' : ''}` : 'libre'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto pb-6 pr-6 pt-3">
        <div className="relative flex" style={{ height: gridH }}>
          <div className="relative shrink-0" style={{ width: HOUR_W }}>
            {hours.map(h => (
              <span
                key={h.label}
                className="absolute right-2 -translate-y-1/2 text-[11.5px] font-semibold tabular-nums text-ink-3"
                style={{ top: h.top }}
              >
                {h.label}
              </span>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {hours.map(h => (
              <div key={h.label} className="absolute inset-x-0 h-px bg-surface-line" style={{ top: h.top }} />
            ))}

            {showNow && (
              <div
                className="pointer-events-none absolute z-[8] flex items-center"
                style={{ top: (now - DAY_START) * pxPerMin, left: -HOUR_W + 4, right: 0 }}
              >
                <span className="grid h-5 shrink-0 place-items-center rounded-pill bg-ink px-1.5 text-[11px] font-bold tabular-nums text-white">
                  {fmt(now)}
                </span>
                <span className="h-0.5 flex-1 bg-ink" />
              </div>
            )}

            <div className="absolute inset-0 flex">
              {days.map(d => (
                <div
                  key={d.offset}
                  className={`relative min-w-0 flex-1 ${d.isToday ? 'bg-[rgba(8,121,255,.035)]' : ''}`}
                  style={{ height: gridH }}
                  onClick={e => {
                    if (e.target !== e.currentTarget) return;
                    openEmpty(d.offset, e.clientY, e.currentTarget);
                  }}
                >
                  {activeAppts(d.appointments).map(a => {
                      const start = minutesOfDay(a.starts_at);
                      const top = (start - DAY_START) * pxPerMin + 2;
                      const h = Math.max(a.duration_min * pxPerMin - 4, 28);
                      const accent = a.service_color || catStyle(a.category).color;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            shallowSet({ appt: a.id, new: null, wait: null });
                          }}
                          className="absolute left-1 right-1 overflow-hidden rounded-[12px] border border-surface-line px-2 py-1.5 text-left shadow-sm"
                          style={{
                            top,
                            height: h,
                            background: softAccent(accent),
                            borderLeftWidth: 4,
                            borderLeftColor: accent,
                          }}
                        >
                          <span className="block truncate text-[12.5px] font-bold leading-tight text-ink">
                            {a.client_label}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] font-medium text-ink-3">
                            {a.service_name}
                            {a.service_name ? ' · ' : ''}
                            {fmt(start)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
