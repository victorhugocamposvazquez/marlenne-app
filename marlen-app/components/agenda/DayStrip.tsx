'use client';

import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateFromOffset, skipSunday, weekMondayOffset, weekStripDays } from '@/lib/time';

const SWIPE_MIN = 48;

/** Tira lun–dom: círculos compactos; flechas y swipe saltan de semana (al lunes). */
export default function DayStrip({
  selectedOffset,
  startOffset: _startOffset,
  busyOffsets = [],
  allowSundays = false,
  onSelect,
  onShiftWeek,
}: {
  selectedOffset: number;
  /** @deprecated La tira siempre muestra la semana del día seleccionado. */
  startOffset?: number;
  busyOffsets?: number[];
  /** Tareas personales: domingos seleccionables. Agenda de trabajo: se saltan. */
  allowSundays?: boolean;
  onSelect: (offset: number) => void;
  onShiftWeek?: (delta: -7 | 7) => void;
}) {
  const busy = useMemo(() => new Set(busyOffsets), [busyOffsets]);
  const days = useMemo(() => weekStripDays(selectedOffset), [selectedOffset]);
  const weekKey = useMemo(() => weekMondayOffset(selectedOffset), [selectedOffset]);
  const [enterFrom, setEnterFrom] = useState<'left' | 'right' | null>(null);
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressTap = useRef(false);

  const weekEnterClass =
    enterFrom === 'right'
      ? 'motion-safe:animate-weekEnterFromRight'
      : enterFrom === 'left'
        ? 'motion-safe:animate-weekEnterFromLeft'
        : '';

  const shift = (delta: -7 | 7) => {
    setEnterFrom(delta === 7 ? 'right' : 'left');
    if (onShiftWeek) {
      onShiftWeek(delta);
      return;
    }
    const mon = weekMondayOffset(selectedOffset) + delta;
    onSelect(allowSundays ? mon : skipSunday(mon, 1));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    suppressTap.current = false;
    swipe.current = { x: e.clientX, y: e.clientY, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      s.moved = true;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s?.moved) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    suppressTap.current = true;
    // swipe izquierda → semana siguiente; derecha → anterior
    shift(dx < 0 ? 7 : -7);
  };

  return (
    <div className="flex w-full items-center gap-0.5">
      <button
        type="button"
        aria-label="Semana anterior"
        onClick={() => shift(-7)}
        className="day-strip-arrow-w day-strip-chevron day-strip-h grid shrink-0 place-items-center text-ink"
      >
        <ChevronLeft strokeWidth={3} />
      </button>
      <div
        className="day-strip-h min-w-0 flex-1 overflow-hidden touch-pan-y [touch-action:pan-y]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipe.current = null; }}
      >
        <div
          key={weekKey}
          className={`day-strip-h grid grid-cols-7 items-center gap-0 ${weekEnterClass}`}
        >
        {days.map(d => {
          const on = d.offset === selectedOffset;
          const isSunday = dateFromOffset(d.offset).getUTCDay() === 0;
          const short = d.dow.replace('.', '').slice(0, 3).toUpperCase();
          const disabled = !allowSundays && isSunday;
          return (
            <button
              key={d.offset}
              type="button"
              disabled={disabled}
              aria-current={on ? 'date' : undefined}
              aria-label={`${short} ${d.num}${d.isToday ? ', hoy' : ''}`}
              onClick={e => {
                if (disabled || suppressTap.current) {
                  e.preventDefault();
                  suppressTap.current = false;
                  return;
                }
                onSelect(allowSundays ? d.offset : skipSunday(d.offset, 1));
              }}
              className="flex h-full min-w-0 flex-col items-center justify-center gap-0.5 disabled:cursor-default"
            >
              <span
                className="day-strip-dow truncate font-semibold leading-none"
                style={{
                  color: on
                    ? 'rgb(var(--c-brand-2))'
                    : disabled
                      ? 'rgb(var(--c-ink-3))'
                      : 'rgb(var(--c-ink-2))',
                }}
              >
                {short}
              </span>
              <span
                className="day-strip-circle grid place-items-center rounded-full font-bold tabular-nums leading-none"
                style={{
                  background: on
                    ? 'rgb(var(--c-brand-2))'
                    : d.isToday
                      ? 'rgb(var(--c-brand-soft))'
                      : 'transparent',
                  color: on
                    ? '#FFFFFF'
                    : disabled
                      ? 'rgb(var(--c-ink-3))'
                      : d.isToday
                        ? 'rgb(var(--c-brand))'
                        : 'rgb(var(--c-ink))',
                  boxShadow: d.isToday && !on
                    ? 'inset 0 0 0 1.5px rgb(var(--c-brand) / 0.45)'
                    : undefined,
                }}
              >
                {d.num}
              </span>
              <span
                className="h-1 w-1 shrink-0 rounded-full"
                style={{
                  background: busy.has(d.offset)
                    ? (on ? 'rgb(var(--c-brand-2))' : '#d000a8')
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
        aria-label="Semana siguiente"
        onClick={() => shift(7)}
        className="day-strip-arrow-w day-strip-chevron day-strip-h grid shrink-0 place-items-center text-ink"
      >
        <ChevronRight strokeWidth={3} />
      </button>
    </div>
  );
}
