'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { weekMondayOffset, weekStripDays } from '@/lib/time';

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
  const weekKey = useMemo(() => weekMondayOffset(selectedOffset), [selectedOffset]);
  const [enterFrom, setEnterFrom] = useState<'left' | 'right' | null>(null);
  const weekEnterClass =
    enterFrom === 'right'
      ? 'motion-safe:animate-weekEnterFromRight'
      : enterFrom === 'left'
        ? 'motion-safe:animate-weekEnterFromLeft'
        : '';

  const shift = (delta: -7 | 7) => {
    setEnterFrom(delta === 7 ? 'right' : 'left');
    if (onShiftWeek) onShiftWeek(delta);
    else onSelect(selectedOffset + delta);
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Semana anterior"
        onClick={() => shift(-7)}
        className="grid h-10 w-8 shrink-0 place-items-center text-ink-2 motion-safe:active:scale-[.96]"
      >
        <ChevronLeft size={18} strokeWidth={2.6} />
      </button>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div key={weekKey} className={`grid grid-cols-7 ${weekEnterClass}`}>
        {days.map(d => {
          const on = d.offset === selectedOffset;
          const label = d.dow.replace('.', '');
          const short = label.slice(0, 3).toUpperCase();
          return (
            <button
              key={d.offset}
              type="button"
              aria-current={on ? 'date' : undefined}
              aria-label={`${short} ${d.num}${d.isToday ? ', hoy' : ''}`}
              onClick={() => onSelect(d.offset)}
              className="flex flex-col items-center justify-center gap-0.5 py-0.5"
            >
              <span className={`text-[10px] font-semibold uppercase tracking-[.02em] ${
                on ? 'text-v-2' : 'text-ink-2'
              }`}>
                {short}
              </span>
              <span
                className={`grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold tabular-nums ${
                  on
                    ? 'bg-v-2 text-white'
                    : d.isToday
                      ? 'bg-v-soft text-v-d ring-1 ring-v/40'
                      : 'text-ink'
                }`}
              >
                {d.num}
              </span>
            </button>
          );
        })}
        </div>
      </div>
      <button
        type="button"
        aria-label="Semana siguiente"
        onClick={() => shift(7)}
        className="grid h-10 w-8 shrink-0 place-items-center text-ink-2 motion-safe:active:scale-[.96]"
      >
        <ChevronRight size={18} strokeWidth={2.6} />
      </button>
    </div>
  );
}
