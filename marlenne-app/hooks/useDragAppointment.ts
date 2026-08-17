'use client';

import { useCallback, useRef, useState } from 'react';
import { DAY_START, DAY_END } from '@/lib/time';

export const COL_W = 152;
const THRESHOLD = 5; // px antes de considerar que es un arrastre y no un tap

type Drag = { id: string; start: number; providerId: string };

export function useDragAppointment({
  pxPerMin, snap, providerIds, onDrop, onTap,
}: {
  pxPerMin: number;
  snap: number;
  providerIds: string[];
  onDrop: (id: string, startMin: number, providerId: string) => void;
  onTap?: (id: string) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const ref = useRef<{
    id: string; x0: number; y0: number; start0: number; col0: number;
    duration: number; moved: boolean; last: Drag | null;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string, startMin: number, providerId: string, duration: number, status: string) => {
      if (status === 'done') { onTap?.(id); return; }
      e.preventDefault();
      const col0 = providerIds.indexOf(providerId);
      ref.current = { id, x0: e.clientX, y0: e.clientY, start0: startMin, col0, duration, moved: false, last: null };

      const move = (ev: PointerEvent) => {
        const d = ref.current;
        if (!d) return;
        const dy = ev.clientY - d.y0;
        const dx = ev.clientX - d.x0;
        if (!d.moved && Math.abs(dy) < THRESHOLD && Math.abs(dx) < THRESHOLD) return;
        d.moved = true;

        let start = d.start0 + Math.round(dy / pxPerMin / snap) * snap;
        start = Math.max(DAY_START, Math.min(DAY_END - d.duration, start));

        let col = d.col0 + Math.round(dx / COL_W);
        col = Math.max(0, Math.min(providerIds.length - 1, col));

        const next = { id: d.id, start, providerId: providerIds[col] };
        d.last = next;
        setDrag(next);
      };

      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        const d = ref.current;
        ref.current = null;
        setDrag(null);
        if (!d) return;
        if (!d.moved) { onTap?.(d.id); return; }
        if (d.last) onDrop(d.last.id, d.last.start, d.last.providerId);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [pxPerMin, snap, providerIds, onDrop, onTap],
  );

  return { drag, onPointerDown };
}
