'use client';

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Tira horizontal: si hay más chips, el borde se funde para que se vea que hay que desplazar. */
export default function ChipScroller({
  children,
  className = '',
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [moreLeft, setMoreLeft] = useState(false);
  const [moreRight, setMoreRight] = useState(false);

  const check = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setMoreLeft(el.scrollLeft > 6);
    setMoreRight(max - el.scrollLeft > 6);
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    const track = trackRef.current;
    if (!el) return;
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (track) ro.observe(track);
    el.addEventListener('scroll', check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', check);
    };
  }, [check, children]);

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={scrollerRef}
        role={label ? 'group' : undefined}
        aria-label={label}
        className="overflow-x-auto overscroll-x-contain scroll-smooth pb-0.5 [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={trackRef} className="flex w-max gap-1.5">
          {children}
        </div>
      </div>
      {moreLeft && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-11 bg-gradient-to-r from-surface-card from-20% to-transparent"
        />
      )}
      {moreRight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface-card from-30% to-transparent"
        />
      )}
    </div>
  );
}
