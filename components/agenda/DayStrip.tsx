'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dayStripWindow, skipSunday } from '@/lib/time';

const VISIBLE = 5;

/** Tira de 5 días fijos: flechas cambian ventana; sin scroll para que no baile. */
export default function DayStrip({
  selectedOffset,
  startOffset,
  busyOffsets = [],
  onSelect,
  onPage,
}: {
  selectedOffset: number;
  startOffset: number;
  busyOffsets?: number[];
  onSelect: (offset: number) => void;
  onPage?: (delta: number) => void;
}) {
  const busy = useMemo(() => new Set(busyOffsets), [busyOffsets]);
  const days = useMemo(() => dayStripWindow(startOffset, VISIBLE), [startOffset]);

  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        aria-label="Días anteriores"
        onClick={() => onPage?.(-VISIBLE)}
        className="grid h-14 w-7 shrink-0 place-items-center text-ink"
      >
        <ChevronLeft size={16} strokeWidth={3} />
      </button>
      <div className="grid h-14 min-w-0 flex-1 grid-cols-5">
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
              onClick={() => { if (!d.isSunday) onSelect(skipSunday(d.offset, 1)); }}
              className="flex h-14 flex-col items-center justify-center rounded-[14px] disabled:cursor-default"
              style={{
                background: on ? 'rgb(var(--c-brand-2))' : 'transparent',
                color: on ? '#FFFFFF' : d.isSunday ? 'rgb(var(--c-ink-3))' : 'rgb(var(--c-ink))',
              }}
            >
              <span
                className="w-full truncate text-center text-[11px] font-semibold leading-none"
                style={{ color: on ? '#FFFFFF' : d.isSunday ? 'rgb(var(--c-ink-3))' : 'rgb(var(--c-ink-2))' }}
              >
                {short}
              </span>
              <span className="mt-0.5 text-[17px] font-bold leading-none tabular-nums">{d.num}</span>
              <span
                className="mt-0.5 h-1 w-1 shrink-0 rounded-full"
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
        onClick={() => onPage?.(VISIBLE)}
        className="grid h-14 w-7 shrink-0 place-items-center text-ink"
      >
        <ChevronRight size={16} strokeWidth={3} />
      </button>
    </div>
  );
}
