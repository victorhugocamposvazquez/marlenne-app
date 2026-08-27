'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import { shallowSet } from '@/hooks/useShallowQuery';

/** Los sheets viven en la URL, así el botón atrás del móvil también los cierra. */
const SHEET_PARAMS = ['new', 'appt', 'client', 'wait', 'alta', 'close', 'editar', 'block', 'bloqueo', 'nombre', 'hora', 'servicio', 'con'];
const SHALLOW_SHEET = new Set(['appt', 'close', 'new', 'wait', 'block', 'bloqueo', 'client', 'nombre', 'hora', 'servicio', 'con', 'alta', 'editar']);
const DISMISS_PX = 90;

/** Cierra el sheet quitando sus parámetros y conservando el día y la vista. */
export function useCloseSheet() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    const live = new URLSearchParams(window.location.search);
    const open = SHEET_PARAMS.filter(p => live.has(p));
    for (const p of SHEET_PARAMS) live.delete(p);
    const qs = live.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    if (open.length > 0 && open.every(p => SHALLOW_SHEET.has(p))) {
      shallowSet(Object.fromEntries(SHEET_PARAMS.map(p => [p, null])));
      return;
    }
    router.replace(href, { scroll: false });
  }, [pathname, router]);
}

export default function Sheet({
  title, subtitle, children, footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const close = useCloseSheet();
  const [dy, setDy] = useState(0);
  const [mounted, setMounted] = useState(false);
  const from = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button aria-label="Cerrar" tabIndex={-1} onClick={close} className="absolute inset-0 bg-ink/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[88dvh] w-full max-w-[440px] animate-sheetUp flex-col rounded-t-sheet bg-surface-card shadow-toast"
        style={{ transform: dy ? `translateY(${dy}px)` : undefined, transition: dy ? 'none' : 'transform .2s' }}
      >
        <div
          className="shrink-0 px-5 pb-3 pt-3"
          style={{ touchAction: 'none' }}
          onPointerDown={e => { from.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={e => { if (from.current !== null) setDy(Math.max(0, e.clientY - from.current)); }}
          onPointerUp={() => { if (dy > DISMISS_PX) close(); else setDy(0); from.current = null; }}
        >
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-handle" />
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-title font-extrabold leading-tight tracking-[-.02em]">{title}</h2>
              {subtitle && <p className="mt-0.5 text-label font-medium text-ink-2">{subtitle}</p>}
            </div>
            <IconButton label="Cerrar" onClick={close}>
              <X size={18} strokeWidth={2.2} />
            </IconButton>
          </div>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto px-5 ${footer ? 'pb-2' : 'pb-[max(16px,env(safe-area-inset-bottom))]'}`}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-surface-line px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Piezas compartidas por los dos sheets, para que no se separen los estilos. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 text-caption font-bold uppercase tracking-[.03em] text-ink-3">{label}</div>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full rounded-field border border-surface-line bg-surface-bg/40 px-3.5 py-3 text-body font-semibold text-ink outline-none focus:border-v focus:bg-surface-card';

export { default as Chip } from '@/components/ui/Chip';
