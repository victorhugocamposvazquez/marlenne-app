'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { haptic } from '@/hooks/haptics';

const THRESHOLD = 56;
const MAX = 88;
const ARM = 12;

function canScrollY(el: HTMLElement) {
  const y = getComputedStyle(el).overflowY;
  return (y === 'auto' || y === 'scroll') && el.scrollHeight > el.clientHeight + 1;
}

function scrollerOf(from: EventTarget | null, root: HTMLElement) {
  let n: HTMLElement | null = from instanceof HTMLElement ? from : (from as Node | null)?.parentElement ?? null;
  while (n && n !== root) {
    if (canScrollY(n)) return n;
    n = n.parentElement;
  }
  return canScrollY(root) ? root : null;
}

function skipTarget(from: EventTarget | null) {
  if (!(from instanceof Element)) return false;
  return !!from.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [data-drag-handle], [data-no-pull]');
}

/** Deslizar hacia abajo recarga la pantalla. El layout no tiene overscroll nativo. */
export default function PullRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pull = useRef(0);
  const startY = useRef(0);
  const startX = useRef(0);
  const tracking = useRef(false);
  const armed = useRef(false);
  const ticking = useRef(false);
  const scroller = useRef<HTMLElement | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  busyRef.current = busy || pending;

  const paint = (px: number, animate: boolean) => {
    const shift = shiftRef.current;
    const knob = knobRef.current;
    if (shift) {
      shift.style.transition = animate ? 'transform .28s ease' : 'none';
      shift.style.transform = px ? `translate3d(0,${px}px,0)` : '';
    }
    if (knob) {
      const t = Math.min(1, px / THRESHOLD);
      knob.style.opacity = px ? String(Math.min(1, t * 1.15)) : '0';
      knob.style.transform = `translateY(${8 + px * 0.22}px)`;
    }
  };

  useEffect(() => {
    if (!busy) return;
    const t = window.setTimeout(() => {
      pull.current = 0;
      paint(0, true);
      setBusy(false);
    }, pending ? 8000 : 240);
    return () => window.clearTimeout(t);
  }, [busy, pending]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onStart = (e: TouchEvent) => {
      if (busyRef.current || e.touches.length !== 1) return;
      if (skipTarget(e.target)) return;
      const box = scrollerOf(e.target, root);
      if (box && box.scrollTop > 1) return;
      const t = e.touches[0];
      tracking.current = true;
      armed.current = false;
      ticking.current = false;
      scroller.current = box;
      startY.current = t.clientY;
      startX.current = t.clientX;
      pull.current = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dy = t.clientY - startY.current;
      const dx = t.clientX - startX.current;
      if (!armed.current) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          tracking.current = false;
          return;
        }
        if (dy < ARM) return;
        if (scroller.current && scroller.current.scrollTop > 1) {
          tracking.current = false;
          return;
        }
        armed.current = true;
      }
      if (dy <= 0) {
        pull.current = 0;
        paint(0, false);
        return;
      }
      e.preventDefault();
      const next = Math.min(MAX, dy * 0.42);
      pull.current = next;
      if (next >= THRESHOLD && !ticking.current) {
        ticking.current = true;
        haptic('tick');
      }
      paint(next, false);
    };

    const finish = () => {
      if (!tracking.current) return;
      tracking.current = false;
      const go = armed.current && pull.current >= THRESHOLD;
      armed.current = false;
      if (!go) {
        pull.current = 0;
        paint(0, true);
        return;
      }
      haptic('start');
      pull.current = 48;
      paint(48, true);
      setBusy(true);
      startTransition(() => router.refresh());
    };

    root.addEventListener('touchstart', onStart, { passive: true });
    root.addEventListener('touchmove', onMove, { passive: false });
    root.addEventListener('touchend', finish);
    root.addEventListener('touchcancel', finish);
    return () => {
      root.removeEventListener('touchstart', onStart);
      root.removeEventListener('touchmove', onMove);
      root.removeEventListener('touchend', finish);
      root.removeEventListener('touchcancel', finish);
    };
  }, [router]);

  return (
    <div ref={rootRef} className="relative flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={knobRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center opacity-0"
      >
        <Loader2
          size={22}
          strokeWidth={2.4}
          className={`text-v-d ${busy ? 'motion-safe:animate-spin' : ''}`}
        />
      </div>
      <div ref={shiftRef} className="flex h-0 min-h-0 flex-1 flex-col">
        {children}
      </div>
      <span className="sr-only" aria-live="polite">{busy ? 'Actualizando' : ''}</span>
    </div>
  );
}
