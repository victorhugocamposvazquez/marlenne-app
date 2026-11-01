'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { weekMondayOffset } from '@/lib/time';

/**
 * Al cambiar de semana, el grid entra desde fuera con un tramo en blanco
 * a un lado (estilo Simply). Una sola vista — sin duplicar DayGrid.
 */
export default function AgendaWeekCarousel({
  day,
  children,
}: {
  day: number;
  children: ReactNode;
}) {
  const weekKey = weekMondayOffset(day);
  const prevWeekRef = useRef(weekKey);
  const [enterDir, setEnterDir] = useState<'next' | 'prev' | null>(null);

  useLayoutEffect(() => {
    if (weekKey === prevWeekRef.current) return;
    const dir = weekKey > prevWeekRef.current ? 'next' : 'prev';
    prevWeekRef.current = weekKey;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEnterDir(null);
      return;
    }
    setEnterDir(dir);
  }, [weekKey]);

  const enterClass =
    enterDir === 'next'
      ? 'motion-safe:animate-weekBodyEnterNext'
      : enterDir === 'prev'
        ? 'motion-safe:animate-weekBodyEnterPrev'
        : '';

  return (
    <div className="relative flex h-0 min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        key={weekKey}
        className={`flex min-h-0 flex-1 flex-col will-change-transform ${enterClass}`}
        onAnimationEnd={() => setEnterDir(null)}
      >
        {children}
      </div>
    </div>
  );
}
