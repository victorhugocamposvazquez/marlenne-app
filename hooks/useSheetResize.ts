'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '@/hooks/haptics';
import {
  nextSheetHeight,
  rubberHeight,
  sheetDetents,
  snapSheetHeight,
} from '@/lib/sheet-detent';

export type SheetDetent = 'peek' | 'mid' | 'tall';

const TAP = 10;

function detentIndex(d: SheetDetent) {
  return d === 'peek' ? 0 : d === 'tall' ? 2 : 1;
}

/**
 * Altura de pantalla al abrir el panel. El teclado de Safari dispara
 * resize / visualViewport; si los seguimos, el asidero baila.
 * Solo se actualiza al girar el aparato (cambia el ancho).
 */
function useStableLayoutH() {
  const width = useRef(typeof window === 'undefined' ? 0 : window.innerWidth);
  const height = useRef(typeof window === 'undefined' ? 800 : window.innerHeight);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth === width.current) return;
      width.current = window.innerWidth;
      height.current = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return () => height.current;
}

export function useSheetResize(
  initial: SheetDetent = 'mid',
  { floorDetent }: { floorDetent?: SheetDetent } = {},
) {
  const layoutH = useStableLayoutH();
  const floorIdx = floorDetent ? detentIndex(floorDetent) : 0;
  const startH = () => {
    const d = sheetDetents(layoutH());
    return d[Math.max(detentIndex(initial), floorIdx)];
  };

  const [height, setHeight] = useState(startH);
  const [dragging, setDragging] = useState(false);
  const live = useRef(startH());
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

  const onHandleDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, label')) return;
    e.preventDefault();
    e.stopPropagation();
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
      const [min, , max] = sheetDetents(layoutH());
      setLive(rubberHeight(s.h0 - (ev.clientY - s.y0), min, max));
    };

    const end = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const detents = sheetDetents(layoutH());
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
  }, [layoutH]);

  useEffect(() => () => cleanup.current?.(), []);

  return { height, dragging, onHandleDown };
}
