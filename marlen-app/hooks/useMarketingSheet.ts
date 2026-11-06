'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '@/hooks/haptics';
import {
  marketingSheetMid,
  marketingSheetStops,
  nearestSheetHeight,
} from '@/lib/sheet-detent';

const TAP = 10;
const OPEN_HEIGHT = marketingSheetMid(marketingSheetStops(740));

/** Asidero de la hoja de configuración en el editor móvil de marketing. */
export function useMarketingSheet(active: boolean, reserved = 0) {
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef(OPEN_HEIGHT);
  const [height, setHeight] = useState(OPEN_HEIGHT);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState(true);
  const session = useRef<{ pointerId: number; y0: number; h0: number } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const available = () => {
    const host = hostRef.current;
    const h = host?.clientHeight || (typeof window === 'undefined' ? 800 : window.innerHeight);
    return Math.max(420, h - 60 - reserved);
  };

  const setLive = (h: number) => {
    live.current = h;
    setHeight(h);
  };

  useEffect(() => {
    const mid = marketingSheetMid(marketingSheetStops(available()));
    setLive(mid);
    if (!active) return;
    setHint(true);
    const done = window.setTimeout(() => setHint(false), 1800);
    return () => window.clearTimeout(done);
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
    session.current = { pointerId, y0: e.clientY, h0: live.current };
    setDragging(true);
    haptic('start');

    const move = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      ev.preventDefault();
      const stops = marketingSheetStops(available());
      const min = stops[0];
      const max = stops[stops.length - 1];
      const raw = s.h0 - (ev.clientY - s.y0);
      setLive(Math.min(max, Math.max(min, raw)));
    };

    const end = (ev: PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const stops = marketingSheetStops(available());
      const moved = ev.clientY - s.y0;
      const stepUp = stops.find((d) => d > s.h0 + 12);
      const next = Math.abs(moved) < TAP
        ? (stepUp ?? marketingSheetMid(stops))
        : nearestSheetHeight(live.current, stops);
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
