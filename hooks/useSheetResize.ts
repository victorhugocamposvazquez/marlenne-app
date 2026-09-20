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

/** Altura estable del layout; no se encoge con el teclado virtual. */
function layoutH() {
  return window.innerHeight;
}

function visibleH() {
  return window.visualViewport?.height ?? window.innerHeight;
}

/** Cuánto tapa el teclado desde abajo (px). */
function keyboardInset() {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, layoutH() - vv.height - vv.offsetTop);
}

function keyboardOpen() {
  return keyboardInset() > 72;
}

/** Tope superior del panel cuando hay teclado: casi todo el viewport visible. */
function heightAboveKeyboard(detents: [number, number, number]) {
  return Math.min(detents[2], Math.max(detents[0], visibleH() - 12));
}

const TAP = 10;

function detentIndex(d: SheetDetent) {
  return d === 'peek' ? 0 : d === 'tall' ? 2 : 1;
}

export function useSheetResize(
  initial: SheetDetent = 'mid',
  { floorDetent }: { floorDetent?: SheetDetent } = {},
) {
  const floorIdx = floorDetent ? detentIndex(floorDetent) : 0;
  const startH = () => {
    const d = sheetDetents(layoutH());
    return d[Math.max(detentIndex(initial), floorIdx)];
  };

  const [height, setHeight] = useState(startH);
  const [keyboardBottom, setKeyboardBottom] = useState(0);
  const [dragging, setDragging] = useState(false);
  const live = useRef(startH());
  const beforeKeyboard = useRef<number | null>(null);
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

  const floorPx = useCallback((detents: [number, number, number]) => detents[floorIdx], [floorIdx]);

  const syncViewport = useCallback(() => {
    if (session.current) return;
    const detents = sheetDetents(layoutH());
    const inset = keyboardInset();
    setKeyboardBottom(inset);

    if (keyboardOpen()) {
      if (beforeKeyboard.current === null) beforeKeyboard.current = live.current;
      setLive(Math.max(heightAboveKeyboard(detents), floorPx(detents)));
      return;
    }

    if (beforeKeyboard.current !== null) {
      const restore = floorDetent ? detents[floorIdx] : beforeKeyboard.current;
      beforeKeyboard.current = null;
      setLive(restore);
      return;
    }

    setLive(snapSheetHeight(live.current, detents, 0));
  }, [floorDetent, floorIdx, floorPx]);

  useEffect(() => {
    syncViewport();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncViewport);
    vv?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    return () => {
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      cleanup.current?.();
    };
  }, [initial, floorDetent, syncViewport]);

  const ensureMid = useCallback(() => {
    const detents = sheetDetents(layoutH());
    const min = floorPx(detents);
    if (live.current < min - 16) setLive(min);
  }, [floorPx]);

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
      const detents = sheetDetents(layoutH());
      const dragMin = detents[0];
      const max = keyboardOpen() ? heightAboveKeyboard(detents) : detents[2];
      setLive(rubberHeight(s.h0 - (ev.clientY - s.y0), dragMin, max));
    };

    const end = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const detents = sheetDetents(layoutH());
      const [dragMin] = detents;
      const moved = ev.clientY - s.y0;

      if (keyboardOpen()) {
        session.current = null;
        setDragging(false);
        setLive(Math.max(heightAboveKeyboard(detents), floorPx(detents)));
        cleanup.current?.();
        return;
      }

      const next = live.current < dragMin
        ? dragMin
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
  }, [floorPx]);

  return { height, dragging, onHandleDown, ensureMid, keyboardBottom };
}
