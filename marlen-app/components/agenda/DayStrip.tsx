'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateFromOffset, skipSunday, weekMondayOffset, weekStripDays } from '@/lib/time';

const SWIPE_MIN = 48;
const SLIDE_MS = 380;
/** Hueco blanco entre semanas durante el slide (estilo Simply). */
const WEEK_SLIDE_GAP = 56;

type WeekSlide = {
  leaving: number;
  entering: number;
  dir: 'next' | 'prev';
  at: 'start' | 'end';
};

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function trackTransform(slide: WeekSlide, stride: number): string {
  if (stride <= 0) return 'translateX(0)';
  const x =
    slide.dir === 'next'
      ? slide.at === 'start'
        ? 0
        : -stride
      : slide.at === 'start'
        ? -stride
        : 0;
  return `translateX(${x}px)`;
}

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
  const weekMon = weekMondayOffset(selectedOffset);
  const [slide, setSlide] = useState<WeekSlide | null>(null);
  /** Evita un frame con la semana vieja tras el carrusel, hasta que llegue el offset nuevo. */
  const [heldMon, setHeldMon] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressTap = useRef(false);

  const stride = viewportW > 0 ? viewportW + WEEK_SLIDE_GAP : 0;

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.clientWidth;
      if (w > 0) setViewportW(w);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const commitWeek = useCallback(
    (delta: -7 | 7) => {
      if (onShiftWeek) {
        onShiftWeek(delta);
        return;
      }
      const mon = weekMondayOffset(selectedOffset) + delta;
      onSelect(allowSundays ? mon : skipSunday(mon, 1));
    },
    [allowSundays, onSelect, onShiftWeek, selectedOffset],
  );

  const shift = useCallback(
    (delta: -7 | 7) => {
      if (reducedMotion()) {
        commitWeek(delta);
        return;
      }
      const leaving = weekMondayOffset(selectedOffset);
      const entering = leaving + delta;
      const w = viewportRef.current?.clientWidth ?? 0;
      if (w > 0) setViewportW(w);
      setSlide({
        leaving,
        entering,
        dir: delta === 7 ? 'next' : 'prev',
        at: 'start',
      });
    },
    [commitWeek, selectedOffset],
  );

  useLayoutEffect(() => {
    if (!slide || slide.at !== 'start') return;
    const w = viewportRef.current?.clientWidth ?? 0;
    if (w > 0) setViewportW(w);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSlide(s => (s ? { ...s, at: 'end' } : null)));
    });
    return () => cancelAnimationFrame(id);
  }, [slide?.leaving, slide?.entering, slide?.dir]);

  const onTrackTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform' || !slide || slide.at !== 'end') return;
    const delta = (slide.entering - slide.leaving) as -7 | 7;
    setHeldMon(slide.entering);
    setSlide(null);
    commitWeek(delta);
  };

  const displayMon = heldMon ?? weekMon;

  useEffect(() => {
    if (heldMon !== null && weekMon === heldMon) setHeldMon(null);
  }, [heldMon, weekMon]);

  const renderWeek = (mondayOffset: number) => {
    const days = weekStripDays(mondayOffset);
    return days.map(d => {
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
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (slide) return;
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
    if (!s?.moved || slide) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    suppressTap.current = true;
    shift(dx < 0 ? 7 : -7);
  };

  const leftMon = slide ? (slide.dir === 'next' ? slide.leaving : slide.entering) : displayMon;
  const rightMon = slide ? (slide.dir === 'next' ? slide.entering : slide.leaving) : displayMon;
  const panelPx = slide && viewportW > 0 ? viewportW : undefined;

  return (
    <div className="flex w-full items-center gap-0.5">
      <button
        type="button"
        aria-label="Semana anterior"
        disabled={!!slide}
        onClick={() => shift(-7)}
        className="day-strip-arrow-w day-strip-chevron day-strip-h grid shrink-0 place-items-center text-ink disabled:opacity-40"
      >
        <ChevronLeft strokeWidth={3} />
      </button>
      <div
        ref={viewportRef}
        className="day-strip-h min-w-0 flex-1 overflow-hidden touch-pan-y [touch-action:pan-y]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipe.current = null; }}
      >
        <div
          onTransitionEnd={onTrackTransitionEnd}
          className="flex h-full will-change-transform"
          style={{
            transform: slide && stride > 0 ? trackTransform(slide, stride) : 'translateX(0)',
            transition:
              slide?.at === 'end'
                ? `transform ${SLIDE_MS}ms cubic-bezier(.22,.92,.28,1)`
                : 'none',
          }}
        >
          <div
            className="day-strip-h grid shrink-0 grid-cols-7 items-center gap-0"
            style={{ width: panelPx ?? '100%' }}
          >
            {renderWeek(leftMon)}
          </div>
          {slide ? (
            <>
              <div
                className="day-strip-h shrink-0 bg-surface-bg"
                style={{ width: WEEK_SLIDE_GAP }}
                aria-hidden
              />
              <div
                className="day-strip-h grid shrink-0 grid-cols-7 items-center gap-0"
                style={{ width: panelPx ?? '100%' }}
              >
                {renderWeek(rightMon)}
              </div>
            </>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        aria-label="Semana siguiente"
        disabled={!!slide}
        onClick={() => shift(7)}
        className="day-strip-arrow-w day-strip-chevron day-strip-h grid shrink-0 place-items-center text-ink disabled:opacity-40"
      >
        <ChevronRight strokeWidth={3} />
      </button>
    </div>
  );
}
