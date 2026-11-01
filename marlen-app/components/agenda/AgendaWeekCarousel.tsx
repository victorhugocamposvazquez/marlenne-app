'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { weekMondayOffset } from '@/lib/time';

const SLIDE_MS = 440;
/** Hueco blanco grande entre semanas (~media pantalla), estilo Simply. */
const GUTTER_RATIO = 0.5;
const GUTTER_MIN = 180;

type Slide = {
  leaving: ReactNode;
  entering: ReactNode;
  dir: 'next' | 'prev';
  at: 'start' | 'end';
  panelW: number;
  gutterW: number;
  stride: number;
};

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function trackX(slide: Slide) {
  if (slide.dir === 'next') {
    return slide.at === 'start' ? 0 : -slide.stride;
  }
  return slide.at === 'start' ? -slide.stride : 0;
}

/**
 * Al cambiar de semana, el grid se desliza y un bloque blanco grande
 * pasa entre la semana que sale y la que entra (visible en el timeline).
 */
export default function AgendaWeekCarousel({
  day,
  children,
}: {
  day: number;
  children: ReactNode;
}) {
  const weekKey = weekMondayOffset(day);
  const viewportRef = useRef<HTMLDivElement>(null);
  const prevWeekRef = useRef(weekKey);
  const snapshotRef = useRef<ReactNode>(children);
  const [slide, setSlide] = useState<Slide | null>(null);
  const [display, setDisplay] = useState<ReactNode>(children);

  useLayoutEffect(() => {
    if (weekKey === prevWeekRef.current) {
      snapshotRef.current = children;
      setDisplay(children);
      return;
    }

    const oldWeek = prevWeekRef.current;
    const leaving = snapshotRef.current;
    const entering = children;
    prevWeekRef.current = weekKey;
    snapshotRef.current = children;

    if (reducedMotion()) {
      setSlide(null);
      setDisplay(entering);
      return;
    }

    const panelW = viewportRef.current?.clientWidth ?? 0;
    if (panelW <= 0) {
      setSlide(null);
      setDisplay(entering);
      return;
    }

    const gutterW = Math.max(GUTTER_MIN, Math.round(panelW * GUTTER_RATIO));
    setSlide({
      leaving,
      entering,
      dir: weekKey > oldWeek ? 'next' : 'prev',
      at: 'start',
      panelW,
      gutterW,
      stride: panelW + gutterW,
    });
  }, [weekKey, children]);

  useLayoutEffect(() => {
    if (!slide || slide.at !== 'start') return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSlide(s => (s ? { ...s, at: 'end' } : null)));
    });
    return () => cancelAnimationFrame(id);
  }, [slide]);

  const onTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform' || !slide || slide.at !== 'end') return;
    setDisplay(slide.entering);
    setSlide(null);
  };

  const left = slide
    ? slide.dir === 'next' ? slide.leaving : slide.entering
    : display;
  const right = slide
    ? slide.dir === 'next' ? slide.entering : slide.leaving
    : null;

  return (
    <div ref={viewportRef} className="relative flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <div
        onTransitionEnd={onTransitionEnd}
        className="flex min-h-0 flex-1 will-change-transform"
        style={{
          transform: slide ? `translateX(${trackX(slide)}px)` : 'translateX(0)',
          transition:
            slide?.at === 'end'
              ? `transform ${SLIDE_MS}ms cubic-bezier(.22,.92,.28,1)`
              : 'none',
        }}
      >
        <div
          className="flex h-full min-h-0 shrink-0 flex-col"
          style={{ width: slide ? slide.panelW : '100%' }}
        >
          {left}
        </div>
        {slide ? (
          <>
            <div
              className="h-full shrink-0 bg-white"
              style={{ width: slide.gutterW }}
              aria-hidden
            />
            <div
              className="flex h-full min-h-0 shrink-0 flex-col"
              style={{ width: slide.panelW }}
            >
              {right}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
