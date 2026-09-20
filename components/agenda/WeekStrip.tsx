'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { weekStripDays } from '@/lib/time';

/** Semana lun–dom: se toca el día. Las flechas saltan de semana. */
export default function WeekStrip({
  selectedOffset,
  onSelect,
  onShiftWeek,
}: {
  selectedOffset: number;
  onSelect: (offset: number) => void;
  onShiftWeek?: (delta: -7 | 7) => void;
}) {
  const days = weekStripDays(selectedOffset);
  const shift = (delta: -7 | 7) => (onShiftWeek ? onShiftWeek(delta) : onSelect(selectedOffset + delta));

  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        aria-label="Semana anterior"
        onClick={() => shift(-7)}
        className="grid h-auto w-11 shrink-0 place-items-center rounded-field bg-surface-card text-ink-2 shadow-card motion-safe:active:scale-[.96]"
      >
        <ChevronLeft size={22} strokeWidth={2.4} />
      </button>
      <div className="grid min-w-0 flex-1 grid-cols-7 gap-0.5">
        {days.map(d => {
          const on = d.offset === selectedOffset;
          const label = d.dow.replace('.', '');
          const short = label.slice(0, 3);
          return (
            <button
              key={d.offset}
              type="button"
              aria-current={on ? 'date' : undefined}
              aria-label={`${short} ${d.num}${d.isToday ? ', hoy' : ''}`}
              onClick={() => onSelect(d.offset)}
              className={`flex min-h-[4.25rem] flex-col items-center justify-center rounded-field px-0.5 py-1.5 ${
                on
                  ? 'bg-grad text-white'
                  : d.isToday
                    ? 'border-2 border-v bg-v-tint text-v-d'
                    : 'border border-surface-line bg-surface-card text-ink-2'
              }`}
            >
              <span className={`text-micro font-bold uppercase tracking-[.04em] ${on ? 'text-white/85' : ''}`}>
                {short}
              </span>
              <span className="text-body-lg font-extrabold tabular-nums leading-none">{d.num}</span>
              {d.isToday && (
                <span className={`mt-0.5 text-micro font-extrabold ${on ? 'text-white' : 'text-v-d'}`}>
                  Hoy
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Semana siguiente"
        onClick={() => shift(7)}
        className="grid h-auto w-11 shrink-0 place-items-center rounded-field bg-surface-card text-ink-2 shadow-card motion-safe:active:scale-[.96]"
      >
        <ChevronRight size={22} strokeWidth={2.4} />
      </button>
    </div>
  );
}
