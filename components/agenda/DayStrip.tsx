'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dayStripWindow, skipSunday } from '@/lib/time';

/** Tira de 5 días: se toca el día. Las flechas saltan la ventana. */
export default function DayStrip({
  selectedOffset,
  startOffset,
  busyOffsets = [],
  onSelect,
  onShift,
}: {
  selectedOffset: number;
  startOffset: number;
  busyOffsets?: number[];
  onSelect: (offset: number) => void;
  onShift: (delta: -5 | 5) => void;
}) {
  const days = dayStripWindow(startOffset, 5);
  const busy = new Set(busyOffsets);

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Días anteriores"
        onClick={() => onShift(-5)}
        className="grid h-14 w-[34px] shrink-0 place-items-center text-ink"
      >
        <ChevronLeft size={18} strokeWidth={3} />
      </button>
      <div className="flex min-w-0 flex-1 gap-1">
        {days.map(d => {
          const on = d.offset === selectedOffset;
          const short = d.dow.replace('.', '').slice(0, 3).toUpperCase();
          return (
            <button
              key={d.offset}
              type="button"
              disabled={d.isSunday}
              aria-current={on ? 'date' : undefined}
              aria-label={`${short} ${d.num}${d.isToday ? ', hoy' : ''}`}
              onClick={() => !d.isSunday && onSelect(skipSunday(d.offset, 1))}
              className="flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-[14px] disabled:cursor-default"
              style={{
                background: on ? 'rgb(var(--c-ink))' : 'transparent',
                color: on ? '#FFFFFF' : d.isSunday ? 'rgb(var(--c-ink-3))' : 'rgb(var(--c-ink))',
              }}
            >
              <span
                className="text-[11px] font-semibold leading-none"
                style={{ color: on ? '#B7B4C4' : d.isSunday ? 'rgb(var(--c-ink-3))' : 'rgb(var(--c-ink-2))' }}
              >
                {short}
              </span>
              <span className="mt-0.5 text-[17px] font-bold leading-none">{d.num}</span>
              <span
                className="mt-0.5 h-1 w-1 rounded-full"
                style={{
                  background: busy.has(d.offset)
                    ? (on ? '#FFFFFF' : '#d000a8')
                    : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Días siguientes"
        onClick={() => onShift(5)}
        className="grid h-14 w-[34px] shrink-0 place-items-center text-ink"
      >
        <ChevronRight size={18} strokeWidth={3} />
      </button>
    </div>
  );
}
