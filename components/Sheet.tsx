'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

/** Los sheets viven en la URL, así el botón atrás del móvil también los cierra. */
const SHEET_PARAMS = ['new', 'appt', 'client'];
const DISMISS_PX = 90;

/** Cierra el sheet quitando sus parámetros y conservando el día y la vista. */
export function useCloseSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return useCallback(() => {
    const next = new URLSearchParams(params.toString());
    for (const p of SHEET_PARAMS) next.delete(p);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);
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
  const from = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Cerrar" tabIndex={-1} onClick={close} className="absolute inset-0 bg-ink/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[88dvh] w-full max-w-[440px] animate-sheetUp flex-col rounded-t-sheet bg-white shadow-toast"
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
              <h2 className="text-[19px] font-extrabold leading-tight tracking-[-.02em]">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[12.5px] font-medium text-ink-2">{subtitle}</p>}
            </div>
            <button
              onClick={close}
              aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border border-surface-line bg-white text-ink-2 shadow-card"
            >
              <X size={17} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-surface-line px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Piezas compartidas por los dos sheets, para que no se separen los estilos. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[.03em] text-ink-3">{label}</div>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full rounded-field border border-surface-line bg-surface-bg/40 px-3.5 py-3 text-[14px] font-semibold text-ink outline-none focus:border-v focus:bg-white';

export function Chip({
  active, children, ...rest
}: { active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`rounded-chip px-3 py-2 text-[12.5px] font-bold transition ${
        active ? 'bg-grad text-white shadow-pill' : 'border border-surface-line bg-white text-ink-2'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}
