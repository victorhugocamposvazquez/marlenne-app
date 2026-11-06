'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '@/hooks/haptics';
import {
  marketingSheetDetents,
  nextSheetHeight,
  rubberHeight,
  snapSheetHeight,
} from '@/lib/sheet-detent';

const TAP = 10;

/** Asidero de la hoja de configuración en el editor móvil de marketing. */
export function useMarketingSheet(active: boolean) {
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef(340);
  const [height, setHeight] = useState(340);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState(true);
  const played = useRef(false);
  const session = useRef<{
    pointerId: number;
    y0: number;
    h0: number;
    lastY: number;
    lastTs: number;
    vel: number;
  } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const available = () => {
    const host = hostRef.current;
    const h = host?.clientHeight || (typeof window === 'undefined' ? 800 : window.innerHeight);
    return Math.max(420, h - 60);
  };

  const setLive = (h: number) => {
    live.current = h;
    setHeight(h);
  };

  useEffect(() => {
    if (!active || played.current) return;
    const [, mid] = marketingSheetDetents(available());
    setLive(mid - 48);
    const up = window.setTimeout(() => {
      played.current = true;
      const [, settled] = marketingSheetDetents(available());
      setLive(settled);
    }, 60);
    const done = window.setTimeout(() => setHint(false), 2400);
    return () => {
      window.clearTimeout(up);
      window.clearTimeout(done);
    };
  }, [active]);

  const onHandleDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, label')) return;
    e.preventDefault();
    e.stopPropagation();
    setHint(false);
    cleanup.current?.();
    const pointerId = e.pointerId;
    const capture = e.currentTarget as HTMLElement;
    try { capture.setPointerCapture(pointerId); } catch { /* ya capturado */ }
    session.current = {
      pointerId,
      y0: e.clientY,
      h0: live.current,
      lastY: e.clientY,
      lastTs: performance.now(),
      vel: 0,
    };
    setDragging(true);
    haptic('start');

    const move = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      ev.preventDefault();
      const now = performance.now();
      const dt = Math.max(8, now - s.lastTs);
      s.vel = (ev.clientY - s.lastY) / dt;
      s.lastY = ev.clientY;
      s.lastTs = now;
      const [min, , max] = marketingSheetDetents(available());
      setLive(rubberHeight(s.h0 - (ev.clientY - s.y0), min, max));
    };

    const end = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const detents = marketingSheetDetents(available());
      const [min] = detents;
      const moved = ev.clientY - s.y0;
      const next = live.current < min
        ? min
        : Math.abs(moved) < TAP
          ? nextSheetHeight(s.h0, detents)
          : snapSheetHeight(live.current, detents, s.vel);
      session.current = null;
      setDragging(false);
      setLive(next);
      if (next !== s.h0) haptic('tick');
      cleanup.current?.();
    };

    cleanup.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      cleanup.current = null;
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }, []);

  useEffect(() => () => cleanup.current?.(), []);

  return { hostRef, height, dragging, hint, onHandleDown };
}
