'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '@/hooks/haptics';
import {
  nextSheetHeight,
  rubberHeight,
  sheetDetents,
  snapSheetHeight,
} from '@/lib/sheet-detent';

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

/**
 * Asidero tipo Instagram: arrastra para agrandar o encoger.
 * Al soltar encaja en un tope. Un toque sube un tamaño.
 */
function detentIndex(initial: 'peek' | 'mid' | 'tall') {
  return initial === 'peek' ? 0 : initial === 'tall' ? 2 : 1;
}

export function useSheetResize(initial: 'peek' | 'mid' | 'tall' = 'mid') {
  const [height, setHeight] = useState(() => sheetDetents(layoutH())[detentIndex(initial)]);
  const [keyboardBottom, setKeyboardBottom] = useState(0);
  const [dragging, setDragging] = useState(false);
  const live = useRef(sheetDetents(layoutH())[detentIndex(initial)]);
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

  const syncViewport = useCallback(() => {
    if (session.current) return;
    const detents = sheetDetents(layoutH());
    const inset = keyboardInset();
    setKeyboardBottom(inset);

    if (keyboardOpen()) {
      setLive(heightAboveKeyboard(detents));
      return;
    }
    setLive(snapSheetHeight(live.current, detents, 0));
  }, []);

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
  }, [initial, syncViewport]);

  const ensureMid = useCallback(() => {
    const [peek] = sheetDetents(layoutH());
    if (live.current < peek - 16) setLive(peek);
  }, []);

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
      const max = keyboardOpen() ? heightAboveKeyboard(detents) : detents[2];
      setLive(rubberHeight(s.h0 - (ev.clientY - s.y0), detents[0], max));
    };

    const end = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const detents = sheetDetents(layoutH());
      const [min] = detents;
      const moved = ev.clientY - s.y0;

      if (keyboardOpen()) {
        session.current = null;
        setDragging(false);
        setLive(heightAboveKeyboard(detents));
        cleanup.current?.();
        return;
      }

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

  return { height, dragging, onHandleDown, ensureMid, keyboardBottom };
}
