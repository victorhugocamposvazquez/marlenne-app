'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Zona de la vista previa a resaltar. `n` cambia en cada aviso para repetir el mismo id. */
export type ZoneFocus = { id: string; n: number } | null;

type Box = { top: number; left: number; width: number; height: number };

const MAGENTA = '#D000A8';
const FLASH_MS = 1400;
const FADE_MS = 500;
const TAP = 6;
const INTERACTIVE = 'a, button, input, textarea, select, label, iframe';
const PENCIL = 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4';

export const zoneSelector = (id: string) => `[data-zone="${CSS.escape(id)}"]`;

function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(hover: hover) and (pointer: fine)');
    const f = () => setFine(q.matches);
    f();
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);
  return fine;
}

/** Zona editable más interna bajo el puntero (atraviesa capas decorativas sin zona). */
function zoneAt(root: HTMLElement, x: number, y: number, ok: (id: string) => boolean): HTMLElement | null {
  for (const hit of document.elementsFromPoint(x, y)) {
    if (!root.contains(hit)) continue;
    let z = hit.closest<HTMLElement>('[data-zone]');
    while (z && root.contains(z)) {
      if (ok(z.dataset.zone || '')) return z;
      z = z.parentElement?.closest<HTMLElement>('[data-zone]') ?? null;
    }
  }
  return null;
}

/**
 * Envuelve una vista previa con elementos `data-zone`.
 * - `focus`: resalta un momento esa zona (lo que se está editando en el panel).
 * - `hover` + `labelOf` + `onEdit`: con ratón, contorno y botón «Editar»; pulsar la zona abre su ajuste.
 */
export default function ZoneLayer({
  focus,
  hover = false,
  labelOf,
  onEdit,
  style,
  children,
}: {
  focus?: ZoneFocus;
  hover?: boolean;
  labelOf?: (id: string) => string | null;
  onEdit?: (id: string) => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const fine = useFinePointer();
  const editable = hover && fine && !!onEdit && !!labelOf;
  const [hot, setHot] = useState<{ id: string; label: string; box: Box } | null>(null);
  const [lit, setLit] = useState<(Box & { o: number }) | null>(null);

  const measure = (el: HTMLElement): Box => {
    const c = box.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { top: r.top - c.top, left: r.left - c.left, width: r.width, height: r.height };
  };
  const canEdit = (id: string) => !!labelOf?.(id);

  useEffect(() => {
    if (!focus) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const t = performance.now() - t0;
      const el = root.current?.querySelector<HTMLElement>(zoneSelector(focus.id));
      if (!el || !box.current) {
        if (t < 400) raf = requestAnimationFrame(tick);
        else setLit(null);
        return;
      }
      if (t >= FLASH_MS) { setLit(null); return; }
      const o = t < FLASH_MS - FADE_MS ? 1 : (FLASH_MS - t) / FADE_MS;
      setLit({ ...measure(el), o });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [focus]);

  useEffect(() => { if (!editable) setHot(null); }, [editable]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!editable || e.pointerType !== 'mouse' || !root.current) return;
    if (!root.current.contains(e.target as Node)) return;
    if (e.buttons) { setHot(null); return; }
    const z = zoneAt(root.current, e.clientX, e.clientY, canEdit);
    if (!z) { setHot(null); return; }
    const id = z.dataset.zone || '';
    const b = measure(z);
    setHot((h) => (h && h.id === id && Math.abs(h.box.top - b.top) < 1 && Math.abs(h.box.height - b.height) < 1 ? h : { id, label: labelOf!(id) || '', box: b }));
  };

  const onClick = (e: React.MouseEvent) => {
    if (!editable || !root.current) return;
    const target = e.target as HTMLElement;
    if (!root.current.contains(target) || target.closest(INTERACTIVE)) return;
    const d = down.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP) return;
    const z = zoneAt(root.current, e.clientX, e.clientY, canEdit);
    if (z) onEdit!(z.dataset.zone || '');
  };

  const chipTop = hot ? (hot.box.top >= 34 ? hot.box.top - 34 : hot.box.top + 8) : 0;

  return (
    <div
      ref={box}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHot(null)}
      onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }}
      onClick={onClick}
      style={{ position: 'relative', ...style }}
    >
      <div ref={root} style={{ height: '100%', cursor: hot ? 'pointer' : undefined }}>{children}</div>
      {lit && (
        <div
          aria-hidden
          style={{
            position: 'absolute', top: lit.top, left: lit.left, width: lit.width, height: lit.height,
            borderRadius: 8, pointerEvents: 'none', zIndex: 40, opacity: lit.o,
            boxShadow: `0 0 0 3px ${MAGENTA}, 0 0 0 8px rgba(208,0,168,.18)`,
          }}
        />
      )}
      {hot && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute', top: hot.box.top, left: hot.box.left, width: hot.box.width, height: hot.box.height,
              borderRadius: 6, pointerEvents: 'none', zIndex: 41, boxShadow: `inset 0 0 0 2px ${MAGENTA}`,
            }}
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit!(hot.id); }}
            style={{
              position: 'absolute', top: chipTop, left: Math.max(8, hot.box.left + hot.box.width - 8), transform: 'translateX(-100%)',
              zIndex: 42, height: 28, padding: '0 11px', borderRadius: 999, border: 'none', background: '#0F0E1A', color: '#fff',
              fontSize: 12, fontWeight: 600, fontFamily: "var(--font-sora), 'Sora', system-ui, sans-serif",
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(15,14,26,.25)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d={PENCIL} /></svg>
            {hot.label}
          </button>
        </>
      )}
    </div>
  );
}

/** Lleva el panel al ajuste `data-field={key}`, enfoca su campo y lo marca un momento. */
export function jumpToField(key: string | null) {
  if (!key) return;
  let tries = 0;
  const go = () => {
    const el = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(key)}"]`);
    if (!el) { if (++tries < 12) requestAnimationFrame(go); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const input = el.matches('input, textarea')
      ? el
      : el.querySelector<HTMLElement>('input:not([type="file"]):not([type="color"]), textarea');
    input?.focus({ preventScroll: true });
    el.animate(
      [
        { boxShadow: '0 0 0 3px rgba(208,0,168,.55)' },
        { boxShadow: '0 0 0 3px rgba(208,0,168,.55)', offset: 0.6 },
        { boxShadow: '0 0 0 3px rgba(208,0,168,0)' },
      ],
      { duration: FLASH_MS },
    );
  };
  requestAnimationFrame(go);
}
