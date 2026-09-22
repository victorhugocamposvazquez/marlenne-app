'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dayStripWindow, skipSunday } from '@/lib/time';

const VISIBLE = 5;
const PAST = 90;
const FUTURE = 180;

/** Tira de días: scroll horizontal bajo el dedo; flechas desplazan 5 días; celdas fijas. */
export default function DayStrip({
  selectedOffset,
  startOffset,
  busyOffsets = [],
  onSelect,
}: {
  selectedOffset: number;
  startOffset: number;
  busyOffsets?: number[];
  onSelect: (offset: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const busy = useMemo(() => new Set(busyOffsets), [busyOffsets]);
  const from = Math.min(startOffset, selectedOffset) - PAST;
  const days = useMemo(
    () => dayStripWindow(from, FUTURE + PAST + Math.abs(selectedOffset - startOffset) + 1),
    [from, selectedOffset, startOffset],
  );

  useLayoutEffect(() => {
    const box = scrollerRef.current;
    if (!box) return;
    const size = () => box.style.setProperty('--day-cell', `${box.clientWidth / VISIBLE}px`);
    size();
    const ro = new ResizeObserver(size);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const box = scrollerRef.current;
    const cell = box?.querySelector<HTMLElement>(`[data-off="${startOffset}"]`);
    if (!box || !cell) return;
    box.scrollTo({ left: cell.offsetLeft });
  }, [startOffset]);

  const scrollByDays = (n: number) => {
    const box = scrollerRef.current;
    if (!box) return;
    box.scrollBy({ left: n * (box.clientWidth / VISIBLE), behavior: 'smooth' });
  };

  return (
    <div className="flex w-full items-center">
      <button
        type="button"
        aria-label="Días anteriores"
        onClick={() => scrollByDays(-VISIBLE)}
        className="day-strip-arrow-w day-strip-chevron day-strip-h grid shrink-0 place-items-center text-ink"
      >
        <ChevronLeft strokeWidth={3} />
      </button>
      <div
        ref={scrollerRef}
        className="day-strip-h relative min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex h-full">
          {days.map(d => {
            const on = d.offset === selectedOffset;
            const short = d.dow.replace('.', '').slice(0, 3).toUpperCase();
            return (
              <button
                key={d.offset}
                data-off={d.offset}
                type="button"
                disabled={d.isSunday}
                aria-current={on ? 'date' : undefined}
                aria-label={`${short} ${d.num}${d.isToday ? ', hoy' : ''}`}
                onClick={() => { if (!d.isSunday) onSelect(skipSunday(d.offset, 1)); }}
                className="flex h-full shrink-0 snap-start flex-col items-center justify-center rounded-[14px] disabled:cursor-default"
                style={{
                  width: 'var(--day-cell)',
                  flex: '0 0 var(--day-cell)',
                  background: on ? 'rgb(var(--c-brand-2))' : 'transparent',
                  color: on ? '#FFFFFF' : d.isSunday ? 'rgb(var(--c-ink-3))' : 'rgb(var(--c-ink))',
                }}
              >
                <span
                  className="day-strip-dow w-full truncate text-center font-semibold leading-none"
                  style={{ color: on ? '#FFFFFF' : d.isSunday ? 'rgb(var(--c-ink-3))' : 'rgb(var(--c-ink-2))' }}
                >
                  {short}
                </span>
                <span className="day-strip-num mt-0.5 font-bold leading-none tabular-nums">{d.num}</span>
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
      </div>
      <button
        type="button"
        aria-label="Días siguientes"
        onClick={() => scrollByDays(VISIBLE)}
        className="day-strip-arrow-w day-strip-chevron day-strip-h grid shrink-0 place-items-center text-ink"
      >
        <ChevronRight strokeWidth={3} />
      </button>
    </div>
  );
}
