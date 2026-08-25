'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { DAY_START, DAY_END } from '@/lib/time';

export const COL_W = 152;
const HOLD_MS = 420;
const SLOP = 12;
const EDGE = 56;

type Drag = { id: string; start: number; providerId: string };

type Session = {
  id: string;
  x0: number;
  y0: number;
  start0: number;
  col0: number;
  providerId0: string;
  duration: number;
  armed: boolean;
  scrolled: boolean;
  last: Drag | null;
  scrollTop0: number;
  scrollLeft0: number;
};

/**
 * Pulsación larga para coger la cita. El toque corto abre la ficha y el
 * gesto vertical sigue siendo scroll: si se arma al primer pixel, en iPad
 * no se puede bajar el día.
 */
export function useDragAppointment({
  pxPerMin, snap, providerIds, scrollRef, onDrop, onTap,
}: {
  pxPerMin: number;
  snap: number;
  providerIds: string[];
  scrollRef: RefObject<HTMLElement | null>;
  onDrop: (id: string, startMin: number, providerId: string) => void;
  onTap?: (id: string) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const session = useRef<Session | null>(null);
  const holdTimer = useRef(0);
  const raf = useRef(0);
  const lastEv = useRef<PointerEvent | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string, startMin: number, providerId: string, duration: number, status: string) => {
      if (status === 'done') { onTap?.(id); return; }
      if (e.button !== 0) return;

      const box = scrollRef.current;
      const col0 = Math.max(0, providerIds.indexOf(providerId));
      session.current = {
        id,
        x0: e.clientX,
        y0: e.clientY,
        start0: startMin,
        col0,
        providerId0: providerId,
        duration,
        armed: false,
        scrolled: false,
        last: null,
        scrollTop0: box?.scrollTop ?? 0,
        scrollLeft0: box?.scrollLeft ?? 0,
      };

      const place = (ev: PointerEvent, d: Session): Drag => {
        const sc = scrollRef.current;
        const dy = (ev.clientY - d.y0) + ((sc?.scrollTop ?? 0) - d.scrollTop0);
        const dx = (ev.clientX - d.x0) + ((sc?.scrollLeft ?? 0) - d.scrollLeft0);
        let start = d.start0 + Math.round(dy / pxPerMin / snap) * snap;
        start = Math.max(DAY_START, Math.min(DAY_END - d.duration, start));
        let col = d.col0 + Math.round(dx / COL_W);
        col = Math.max(0, Math.min(providerIds.length - 1, col));
        return { id: d.id, start, providerId: providerIds[col] ?? d.providerId0 };
      };

      const stopRaf = () => {
        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = 0;
      };

      const tick = () => {
        raf.current = 0;
        const d = session.current;
        const ev = lastEv.current;
        const sc = scrollRef.current;
        if (!d?.armed || !ev || !sc) return;
        const r = sc.getBoundingClientRect();
        let step = 0;
        if (ev.clientY < r.top + EDGE) step = -14;
        else if (ev.clientY > r.bottom - EDGE) step = 14;
        if (!step) return;
        sc.scrollTop += step;
        const next = place(ev, d);
        d.last = next;
        setDrag(next);
        raf.current = requestAnimationFrame(tick);
      };

      holdTimer.current = window.setTimeout(() => {
        const d = session.current;
        if (!d || d.scrolled) return;
        d.armed = true;
        try { navigator.vibrate?.(12); } catch { /* */ }
        const next = { id: d.id, start: d.start0, providerId: d.providerId0 };
        d.last = next;
        setDrag(next);
      }, HOLD_MS);

      const move = (ev: PointerEvent) => {
        lastEv.current = ev;
        const d = session.current;
        if (!d) return;
        if (!d.armed) {
          if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > SLOP) {
            d.scrolled = true;
            window.clearTimeout(holdTimer.current);
          }
          return;
        }
        ev.preventDefault();
        const next = place(ev, d);
        d.last = next;
        setDrag(next);
        if (!raf.current) raf.current = requestAnimationFrame(tick);
      };

      const up = () => {
        window.clearTimeout(holdTimer.current);
        stopRaf();
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        const d = session.current;
        session.current = null;
        lastEv.current = null;
        setDrag(null);
        if (!d) return;
        if (!d.armed) {
          if (!d.scrolled) onTap?.(d.id);
          return;
        }
        const dest = d.last;
        if (!dest) return;
        if (dest.start === d.start0 && dest.providerId === d.providerId0) return;
        onDrop(dest.id, dest.start, dest.providerId);
      };

      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    [pxPerMin, snap, providerIds, scrollRef, onDrop, onTap],
  );

  return { drag, onPointerDown };
}
