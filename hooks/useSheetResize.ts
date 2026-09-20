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

type SheetLayout = { height: number; bottom: number };

/** Altura estable del layout; no se encoge con el teclado virtual. */
function layoutH() {
  return window.innerHeight;
}

function visibleH() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function viewportTop() {
  return window.visualViewport?.offsetTop ?? 0;
}

/** Cuánto tapa el teclado desde abajo (px). */
function keyboardInset() {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, layoutH() - vv.height - vv.offsetTop);
}

const KEYBOARD_OPEN_INSET = 72;
const KEYBOARD_CLOSE_INSET = 48;

/** Con teclado: cabe en el viewport visible. */
function heightAboveKeyboard(detents: [number, number, number]) {
  const top = viewportTop();
  const usable = visibleH() - top - 20;
  return Math.min(detents[2], Math.max(detents[0], usable));
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

  const [layout, setLayout] = useState<SheetLayout>(() => ({ height: startH(), bottom: 0 }));
  const [dragging, setDragging] = useState(false);
  const live = useRef(startH());
  const beforeKeyboard = useRef<number | null>(null);
  const keyboardActive = useRef(false);
  /** Altura bloqueada mientras el teclado sigue abierto (Safari encoge el vv al cambiar de campo). */
  const keyboardHeightLock = useRef(0);
  const session = useRef<{
    pointerId: number;
    y0: number;
    h0: number;
    lastY: number;
    lastTs: number;
    vel: number;
  } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const applyLayout = useCallback((height: number, bottom: number) => {
    live.current = height;
    setLayout({ height, bottom });
  }, []);

  const floorPx = useCallback((detents: [number, number, number]) => detents[floorIdx], [floorIdx]);

  const restoreAfterKeyboard = useCallback((detents: [number, number, number]) => {
    if (floorDetent) return detents[floorIdx];
    if (beforeKeyboard.current != null) return beforeKeyboard.current;
    return live.current;
  }, [floorDetent, floorIdx]);

  const lockKeyboardHeight = useCallback((detents: [number, number, number]) => {
    const candidate = heightAboveKeyboard(detents);
    keyboardHeightLock.current = keyboardHeightLock.current > 0
      ? Math.max(keyboardHeightLock.current, candidate)
      : candidate;
    return keyboardHeightLock.current;
  }, []);

  const closeKeyboard = useCallback((detents: [number, number, number]) => {
    keyboardActive.current = false;
    keyboardHeightLock.current = 0;
    const restore = restoreAfterKeyboard(detents);
    beforeKeyboard.current = null;
    applyLayout(restore, 0);
  }, [applyLayout, restoreAfterKeyboard]);

  const syncKeyboard = useCallback(() => {
    if (session.current) return;
    const detents = sheetDetents(layoutH());
    const inset = keyboardInset();

    if (inset > KEYBOARD_OPEN_INSET || keyboardActive.current) {
      if (inset <= KEYBOARD_CLOSE_INSET) {
        closeKeyboard(detents);
        return;
      }
      keyboardActive.current = true;
      if (beforeKeyboard.current === null) beforeKeyboard.current = live.current;
      applyLayout(lockKeyboardHeight(detents), inset);
    }
  }, [applyLayout, closeKeyboard, lockKeyboardHeight]);

  /** Solo reposiciona sobre el teclado; no recalcula altura (evita encoger al cambiar de input). */
  const syncKeyboardScroll = useCallback(() => {
    if (session.current || !keyboardActive.current) return;
    if (keyboardInset() <= KEYBOARD_CLOSE_INSET) return;
    setLayout(prev => ({ height: prev.height, bottom: keyboardInset() }));
  }, []);

  const syncLayout = useCallback(() => {
    if (session.current || keyboardActive.current) return;
    const detents = sheetDetents(layoutH());
    if (floorDetent) {
      applyLayout(detents[floorIdx], 0);
      return;
    }
    applyLayout(snapSheetHeight(live.current, detents, 0), 0);
  }, [applyLayout, floorDetent, floorIdx]);

  useEffect(() => {
    syncKeyboard();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncKeyboard);
    vv?.addEventListener('scroll', syncKeyboardScroll);
    window.addEventListener('resize', syncLayout);
    return () => {
      vv?.removeEventListener('resize', syncKeyboard);
      vv?.removeEventListener('scroll', syncKeyboardScroll);
      window.removeEventListener('resize', syncLayout);
      cleanup.current?.();
    };
  }, [initial, floorDetent, syncKeyboard, syncKeyboardScroll, syncLayout]);

  const ensureMid = useCallback(() => {
    const detents = sheetDetents(layoutH());
    const min = floorPx(detents);
    if (live.current < min - 16) applyLayout(min, layout.bottom);
  }, [applyLayout, floorPx, layout.bottom]);

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
      const kb = keyboardInset() > KEYBOARD_OPEN_INSET;
      const max = kb ? (keyboardHeightLock.current || heightAboveKeyboard(detents)) : detents[2];
      applyLayout(rubberHeight(s.h0 - (ev.clientY - s.y0), dragMin, max), kb ? keyboardInset() : 0);
    };

    const end = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const detents = sheetDetents(layoutH());
      const [dragMin] = detents;
      const moved = ev.clientY - s.y0;
      const kb = keyboardInset() > KEYBOARD_OPEN_INSET;

      if (kb) {
        session.current = null;
        setDragging(false);
        applyLayout(lockKeyboardHeight(detents), keyboardInset());
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
      applyLayout(next, 0);
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
  }, [applyLayout, lockKeyboardHeight]);

  return {
    height: layout.height,
    keyboardBottom: layout.bottom,
    dragging,
    onHandleDown,
    ensureMid,
  };
}
