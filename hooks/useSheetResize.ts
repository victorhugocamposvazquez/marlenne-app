'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '@/hooks/haptics';
import {
  nextSheetHeight,
  rubberHeight,
  sheetDetents,
  snapSheetHeight,
} from '@/lib/sheet-detent';

function viewH() {
  return window.visualViewport?.height ?? window.innerHeight;
}

const TAP = 10;

/**
 * Asidero tipo Instagram: arrastra para agrandar o encoger.
 * Al soltar encaja en un tope. Un toque sube un tamaño.
 */
export function useSheetResize(initial: 'peek' | 'mid' | 'tall' = 'mid') {
  const [height, setHeight] = useState(320);
  const [dragging, setDragging] = useState(false);
  const live = useRef(320);
  const session = useRef<{
    pointerId: number;
    y0: number;
    h0: number;
    lastY: number;
    lastTs: number;
    vel: number;
  } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const setLive = (h: number) => {
    live.current = h;
    setHeight(h);
  };

  useEffect(() => {
    const i = initial === 'peek' ? 0 : initial === 'tall' ? 2 : 1;
    setLive(sheetDetents(viewH())[i]);
    const onResize = () => {
      if (session.current) return;
      setLive(snapSheetHeight(live.current, sheetDetents(viewH()), 0));
    };
    window.visualViewport?.addEventListener('resize', onResize);
    window.addEventListener('resize', onResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', onResize);
      window.removeEventListener('resize', onResize);
      cleanup.current?.();
    };
  }, [initial]);

  const ensureMid = useCallback(() => {
    const [, mid] = sheetDetents(viewH());
    if (live.current < mid - 16) setLive(mid);
  }, []);

  const onHandleDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    cleanup.current?.();
    const pointerId = e.pointerId;
    const capture = e.currentTarget as HTMLElement;
    try { capture.setPointerCapture(pointerId); } catch { /* */ }
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
      const [min, , max] = sheetDetents(viewH());
      setLive(rubberHeight(s.h0 - (ev.clientY - s.y0), min, max));
    };

    const end = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const detents = sheetDetents(viewH());
      const moved = ev.clientY - s.y0;
      const next = Math.abs(moved) < TAP
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

  return { height, dragging, onHandleDown, ensureMid };
}
