'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { DAY_START, DAY_END } from '@/lib/time';
import { haptic } from '@/hooks/haptics';

export const COL_W = 152;
const EDGE = 64;
const FRAME = 16.67;

type Drag = { id: string; start: number; providerId: string };

type Session = {
  id: string;
  pointerId: number;
  x0: number;
  y0: number;
  start0: number;
  providerId0: string;
  duration: number;
  last: Drag | null;
  scrollTop0: number;
  lastTs: number;
  lastHapticStart: number;
  lastHapticCol: string;
};

/**
 * El asidero mueve hora y profesional. Las citas viven en una capa sobre
 * las columnas: si se desmontan al cambiar de columna, iOS cancela el gesto.
 */
export function useDragAppointment({
  pxPerMin, snap, providerIds, scrollRef, gridRef, onDrop,
}: {
  pxPerMin: number;
  snap: number;
  providerIds: string[];
  scrollRef: RefObject<HTMLElement | null>;
  gridRef: RefObject<HTMLElement | null>;
  onDrop: (id: string, startMin: number, providerId: string) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const session = useRef<Session | null>(null);
  const raf = useRef(0);
  const lastEv = useRef<PointerEvent | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const runCleanup = () => {
    const fn = cleanup.current;
    cleanup.current = null;
    fn?.();
  };

  useEffect(() => () => runCleanup(), []);

  const onHandleDown = useCallback(
    (e: React.PointerEvent, id: string, startMin: number, providerId: string, duration: number) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const box = scrollRef.current;
      const ids = providerIds.filter(Boolean);
      session.current = {
        id,
        pointerId: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        start0: startMin,
        providerId0: providerId,
        duration,
        last: { id, start: startMin, providerId },
        scrollTop0: box?.scrollTop ?? 0,
        lastTs: performance.now(),
        lastHapticStart: startMin,
        lastHapticCol: providerId,
      };
      lastEv.current = e.nativeEvent;
      setDrag(session.current.last);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
      haptic('start');
      if (box) box.style.touchAction = 'none';

      /** Rect fresco en cada move: si se cachea, el auto-scroll X apunta a la columna equivocada. */
      const colAt = (clientX: number) => {
        if (ids.length <= 1) return 0;
        const grid = gridRef.current;
        if (!grid) return 0;
        const col = Math.floor((clientX - grid.getBoundingClientRect().left) / COL_W);
        return Math.min(Math.max(col, 0), ids.length - 1);
      };

      const place = (ev: PointerEvent, d: Session): Drag => {
        const sc = scrollRef.current;
        const dy = (ev.clientY - d.y0) + ((sc?.scrollTop ?? 0) - d.scrollTop0);
        let start = d.start0 + Math.round(dy / pxPerMin / snap) * snap;
        start = Math.max(DAY_START, Math.min(DAY_END - d.duration, start));
        const col = colAt(ev.clientX);
        const nextId = ids[col] ?? d.providerId0;
        if (start !== d.lastHapticStart || nextId !== d.lastHapticCol) {
          d.lastHapticStart = start;
          d.lastHapticCol = nextId;
          haptic('tick');
        }
        return { id: d.id, start, providerId: nextId };
      };

      const stopRaf = () => {
        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = 0;
      };

      const edgePull = (overflow: number, dt: number) => {
        const t = Math.min(1, Math.max(0, overflow / EDGE));
        return t * t * 22 * (dt / FRAME);
      };

      const tick = (now: number) => {
        raf.current = 0;
        const d = session.current;
        const ev = lastEv.current;
        const sc = scrollRef.current;
        if (!d || !ev || !sc) return;
        const dt = Math.min(32, now - d.lastTs);
        d.lastTs = now;
        const r = sc.getBoundingClientRect();
        let y = 0;
        let x = 0;
        if (ev.clientY < r.top + EDGE) y = -edgePull(r.top + EDGE - ev.clientY, dt);
        else if (ev.clientY > r.bottom - EDGE) y = edgePull(ev.clientY - (r.bottom - EDGE), dt);
        if (ev.clientX < r.left + EDGE) x = -edgePull(r.left + EDGE - ev.clientX, dt);
        else if (ev.clientX > r.right - EDGE) x = edgePull(ev.clientX - (r.right - EDGE), dt);
        if (!x && !y) return;
        if (y) sc.scrollTop += y;
        if (x) sc.scrollLeft += x;
        const next = place(ev, d);
        d.last = next;
        setDrag(next);
        raf.current = requestAnimationFrame(tick);
      };

      const blockScroll = (ev: TouchEvent) => { ev.preventDefault(); };

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== session.current?.pointerId) return;
        lastEv.current = ev;
        const d = session.current;
        if (!d) return;
        ev.preventDefault();
        const next = place(ev, d);
        d.last = next;
        setDrag(next);
        if (!raf.current) raf.current = requestAnimationFrame(tick);
      };

      const end = (commit: boolean) => {
        const d = session.current;
        try {
          if (!commit || !d?.last) return;
          if (!d.last.providerId) return;
          if (d.last.start === d.start0 && d.last.providerId === d.providerId0) return;
          onDrop(d.last.id, d.last.start, d.last.providerId);
        } finally {
          runCleanup();
          session.current = null;
          lastEv.current = null;
          setDrag(null);
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== session.current?.pointerId) return;
        end(true);
      };
      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== session.current?.pointerId) return;
        end(false);
      };

      cleanup.current = () => {
        stopRaf();
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('touchmove', blockScroll);
        if (box) box.style.touchAction = '';
      };

      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('touchmove', blockScroll, { passive: false });
    },
    [pxPerMin, snap, providerIds, scrollRef, gridRef, onDrop],
  );

  return { drag, onHandleDown };
}
