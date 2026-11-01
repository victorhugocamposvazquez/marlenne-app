'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateFromOffset, skipSunday, weekMondayOffset, weekStripDays } from '@/lib/time';

const SWIPE_MIN = 40;
const LOCK_PX = 10;
const SNAP_MS = 420;
/** Completar si el dedo pasó ~18% del stride o hay velocidad. */
const COMMIT_RATIO = 0.18;
const COMMIT_VELOCITY = 0.45; // px/ms

type Carousel = {
  dir: 'next' | 'prev';
  panelW: number;
  gutterW: number;
  stride: number;
  /** translateX actual (durante drag se actualiza en el DOM; aquí al soltar). */
  x: number;
  phase: 'drag' | 'snap';
  /** Si al terminar el snap hay que cambiar de semana. */
  commit: boolean;
};

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function gutterFor(panelW: number) {
  const screen = typeof window !== 'undefined' ? window.innerWidth : panelW;
  return Math.max(panelW, Math.round(screen));
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
  const [carousel, setCarousel] = useState<Carousel | null>(null);
  const [heldMon, setHeldMon] = useState<number | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<Carousel | null>(null);
  const suppressTap = useRef(false);

  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastT: number;
    velocity: number;
    locked: boolean | null; // null = undecided, true = horizontal, false = vertical
    baseX: number;
  } | null>(null);

  useEffect(() => {
    carouselRef.current = carousel;
  }, [carousel]);

  useEffect(() => {
    if (!carousel || carousel.phase !== 'drag') return;
    applyX(carousel.x, false);
  }, [carousel?.dir, carousel?.panelW, carousel?.gutterW, carousel?.phase]);

  const displayMon = heldMon ?? weekMon;

  useEffect(() => {
    if (heldMon !== null && weekMon === heldMon) setHeldMon(null);
  }, [heldMon, weekMon]);

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

  const applyX = (x: number, withTransition: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = withTransition
      ? `transform ${SNAP_MS}ms cubic-bezier(.42,0,.58,1)`
      : 'none';
    el.style.transform = `translateX(${x}px)`;
  };

  const beginCarousel = (dir: 'next' | 'prev') => {
    const panelW = viewportRef.current?.clientWidth ?? 0;
    if (panelW <= 0) return null;
    const gutterW = gutterFor(panelW);
    const stride = panelW + gutterW;
    const x = dir === 'next' ? 0 : -stride;
    const next: Carousel = {
      dir,
      panelW,
      gutterW,
      stride,
      x,
      phase: 'drag',
      commit: false,
    };
    carouselRef.current = next;
    setCarousel(next);
    // Transform en el siguiente frame (el track ya monta 3 paneles)
    requestAnimationFrame(() => applyX(x, false));
    return next;
  };

  const finishSnap = (c: Carousel) => {
    const delta: -7 | 7 = c.dir === 'next' ? 7 : -7;
    if (c.commit) {
      setHeldMon(c.dir === 'next' ? weekMondayOffset(selectedOffset) + 7 : weekMondayOffset(selectedOffset) - 7);
      setCarousel(null);
      carouselRef.current = null;
      commitWeek(delta);
    } else {
      setCarousel(null);
      carouselRef.current = null;
    }
  };

  /** Flechas: animación automática (sin seguir dedo). */
  const shift = useCallback(
    (delta: -7 | 7) => {
      if (carouselRef.current) return;
      if (reducedMotion()) {
        commitWeek(delta);
        return;
      }
      const dir = delta === 7 ? 'next' : 'prev';
      const c = beginCarousel(dir);
      if (!c) {
        commitWeek(delta);
        return;
      }
      const target = dir === 'next' ? -c.stride : 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          applyX(target, true);
          setCarousel({ ...c, phase: 'snap', x: target, commit: true });
        });
      });
    },
    [commitWeek, selectedOffset],
  );

  const onTrackTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'transform') return;
    const c = carouselRef.current;
    if (!c || c.phase !== 'snap') return;
    finishSnap(c);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (carouselRef.current?.phase === 'snap') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    suppressTap.current = false;
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
      locked: null,
      baseX: 0,
    };
    try {
      viewportRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;

    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    const rawV = (e.clientX - d.lastX) / dt;
    d.velocity = d.velocity * 0.7 + rawV * 0.3;
    d.lastX = e.clientX;
    d.lastT = now;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (d.locked === null) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.15) {
        d.locked = false;
        drag.current = null;
        return;
      }
      if (Math.abs(dx) > Math.abs(dy) * 1.05) {
        d.locked = true;
        if (reducedMotion()) return;
        const dir: 'next' | 'prev' = dx < 0 ? 'next' : 'prev';
        const c = carouselRef.current?.phase === 'drag'
          ? carouselRef.current
          : beginCarousel(dir);
        if (!c) return;
        // Si el usuario cambió de sentido respecto al carousel ya abierto, reinicia
        if (c.dir !== dir) {
          const rebuilt = beginCarousel(dir);
          if (!rebuilt) return;
          d.baseX = rebuilt.x;
        } else {
          d.baseX = c.x;
        }
        suppressTap.current = true;
      } else {
        return;
      }
    }

    if (d.locked !== true) return;

    const c = carouselRef.current;
    if (!c || c.phase !== 'drag') return;

    // Dedo a la izquierda → contenido a la izquierda (next); derecha → prev
    let x = d.baseX + (e.clientX - d.startX);
    // Limitar al rango del carrusel (con un poco de goma al borde)
    const min = -c.stride;
    const max = 0;
    if (x < min) x = min + (x - min) * 0.18;
    if (x > max) x = max + (x - max) * 0.18;

    c.x = x;
    applyX(x, false);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;

    try {
      viewportRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const c = carouselRef.current;
    if (!c || c.phase !== 'drag') {
      // Swipe corto sin haber montado carrusel → decisión clásica
      if (d.locked === true) {
        const dx = e.clientX - d.startX;
        if (Math.abs(dx) >= SWIPE_MIN) {
          suppressTap.current = true;
          shift(dx < 0 ? 7 : -7);
        }
      }
      return;
    }

    suppressTap.current = true;
    const progress =
      c.dir === 'next'
        ? -c.x / c.stride // 0 → 1 hacia la siguiente
        : (c.x + c.stride) / c.stride; // 0 → 1 hacia la anterior
    const flick =
      (c.dir === 'next' && d.velocity < -COMMIT_VELOCITY)
      || (c.dir === 'prev' && d.velocity > COMMIT_VELOCITY);
    const commit = progress >= COMMIT_RATIO || flick;

    const target = commit
      ? (c.dir === 'next' ? -c.stride : 0)
      : (c.dir === 'next' ? 0 : -c.stride);

    applyX(target, true);
    const snapped: Carousel = { ...c, phase: 'snap', x: target, commit };
    carouselRef.current = snapped;
    setCarousel(snapped);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d && d.pointerId === e.pointerId) drag.current = null;
    const c = carouselRef.current;
    if (c?.phase === 'drag') {
      const target = c.dir === 'next' ? 0 : -c.stride;
      applyX(target, true);
      const snapped: Carousel = { ...c, phase: 'snap', x: target, commit: false };
      carouselRef.current = snapped;
      setCarousel(snapped);
    }
  };

  const leftMon = carousel
    ? (carousel.dir === 'next' ? displayMon : displayMon - 7)
    : displayMon;
  const rightMon = carousel
    ? (carousel.dir === 'next' ? displayMon + 7 : displayMon)
    : displayMon;

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

  const busyCarousel = !!carousel;

  return (
    <div className="flex w-full items-center gap-0.5">
      <button
        type="button"
        aria-label="Semana anterior"
        disabled={busyCarousel}
        onClick={() => shift(-7)}
        className="day-strip-arrow-w day-strip-chevron day-strip-h grid shrink-0 place-items-center text-ink disabled:opacity-40"
      >
        <ChevronLeft strokeWidth={3} />
      </button>
      <div
        ref={viewportRef}
        className="day-strip-h min-w-0 flex-1 overflow-hidden bg-surface-soft [touch-action:pan-y]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          ref={trackRef}
          onTransitionEnd={onTrackTransitionEnd}
          className="flex h-full will-change-transform"
          style={{
            width: carousel ? carousel.panelW * 2 + carousel.gutterW : '100%',
            transform: carousel ? `translateX(${carousel.x}px)` : 'translateX(0)',
            transition: 'none',
          }}
        >
          <div
            className="day-strip-h grid shrink-0 grid-cols-7 items-center gap-0"
            style={{ width: carousel ? carousel.panelW : '100%', flex: '0 0 auto' }}
          >
            {renderWeek(leftMon)}
          </div>
          {carousel ? (
            <>
              <div
                className="day-strip-h shrink-0 bg-surface-soft"
                style={{ width: carousel.gutterW, flex: '0 0 auto' }}
                aria-hidden
              />
              <div
                className="day-strip-h grid shrink-0 grid-cols-7 items-center gap-0"
                style={{ width: carousel.panelW, flex: '0 0 auto' }}
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
        disabled={busyCarousel}
        onClick={() => shift(7)}
        className="day-strip-arrow-w day-strip-chevron day-strip-h grid shrink-0 place-items-center text-ink disabled:opacity-40"
      >
        <ChevronRight strokeWidth={3} />
      </button>
    </div>
  );
}
