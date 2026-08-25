'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { DAY_START, DAY_END } from '@/lib/time';

export const COL_W = 152;
const EDGE = 64;

type Drag = { id: string; start: number; providerId: string };

type Session = {
  id: string;
  pointerId: number;
  x0: number;
  y0: number;
  start0: number;
  col0: number;
  providerId0: string;
  duration: number;
  last: Drag | null;
  scrollTop0: number;
  scrollLeft0: number;
};

/**
 * Solo el asidero inicia el arrastre. El cuerpo de la cita abre la ficha.
 * Mientras se mueve, se bloquea el scroll del dedo (si no, el día viaja
 * con el gesto y la cita apenas cambia de minuto).
 */
export function useDragAppointment({
  pxPerMin, snap, providerIds, scrollRef, onDrop,
}: {
  pxPerMin: number;
  snap: number;
  providerIds: string[];
  scrollRef: RefObject<HTMLElement | null>;
  onDrop: (id: string, startMin: number, providerId: string) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const session = useRef<Session | null>(null);
  const raf = useRef(0);
  const lastEv = useRef<PointerEvent | null>(null);

  const onHandleDown = useCallback(
    (e: React.PointerEvent, id: string, startMin: number, providerId: string, duration: number) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const box = scrollRef.current;
      const col0 = Math.max(0, providerIds.indexOf(providerId));
      session.current = {
        id,
        pointerId: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        start0: startMin,
        col0,
        providerId0: providerId,
        duration,
        last: { id, start: startMin, providerId },
        scrollTop0: box?.scrollTop ?? 0,
        scrollLeft0: box?.scrollLeft ?? 0,
      };
      lastEv.current = e.nativeEvent;
      setDrag(session.current.last);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
      try { navigator.vibrate?.(10); } catch { /* */ }
      if (box) box.style.touchAction = 'none';

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
        if (!d || !ev || !sc) return;
        const r = sc.getBoundingClientRect();
        let step = 0;
        if (ev.clientY < r.top + EDGE) step = -18;
        else if (ev.clientY > r.bottom - EDGE) step = 18;
        if (!step) return;
        sc.scrollTop += step;
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
        stopRaf();
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('touchmove', blockScroll);
        if (box) box.style.touchAction = '';
        const d = session.current;
        session.current = null;
        lastEv.current = null;
        setDrag(null);
        if (!commit || !d?.last) return;
        if (d.last.start === d.start0 && d.last.providerId === d.providerId0) return;
        onDrop(d.last.id, d.last.start, d.last.providerId);
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== session.current?.pointerId) return;
        end(true);
      };
      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== session.current?.pointerId) return;
        end(false);
      };

      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('touchmove', blockScroll, { passive: false });
    },
    [pxPerMin, snap, providerIds, scrollRef, onDrop],
  );

  return { drag, onHandleDown };
}
