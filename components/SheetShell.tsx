'use client';

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSheetResize } from '@/hooks/useSheetResize';

type GrabCtx = {
  onHandleDown: (e: React.PointerEvent) => void;
  dragging: boolean;
};

const SheetGrabContext = createContext<GrabCtx | null>(null);

const OVERLAY_STYLE = {
  top: 'calc(-1 * env(safe-area-inset-top, 0px))',
  minHeight: 'calc(100dvh + env(safe-area-inset-top, 0px))',
} as const;

/** Zona amplia para arrastrar el panel. Los botones/enlaces siguen siendo tocables. */
export function SheetGrab({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(SheetGrabContext);
  if (!ctx) return <div className={className}>{children}</div>;
  return (
    <div
      data-sheet-grab
      className={`touch-none ${className}`}
      style={{ touchAction: 'none' }}
      onPointerDown={ctx.onHandleDown}
    >
      {children}
    </div>
  );
}

/** Barra visual del asidero (la zona táctil la da SheetGrab). */
export function SheetHandle({ className = '' }: { className?: string }) {
  return (
    <div
      className={`mx-auto h-1.5 w-14 rounded-full bg-handle ${className}`}
      aria-hidden
    />
  );
}

export default function SheetShell({
  onClose,
  children,
  initialHeight = 'mid',
  className = '',
  grabHeader = false,
}: {
  onClose: () => void;
  children: ReactNode;
  initialHeight?: 'peek' | 'mid' | 'tall';
  className?: string;
  /** Si false, el hijo debe incluir SheetGrab (p. ej. cabecera del sheet). */
  grabHeader?: boolean;
}) {
  const { height, dragging, onHandleDown } = useSheetResize(initialHeight, onClose);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  const grabCtx: GrabCtx = { onHandleDown, dragging };

  return createPortal(
    <SheetGrabContext.Provider value={grabCtx}>
      <div className="fixed inset-x-0 bottom-0 z-[60]" style={OVERLAY_STYLE}>
        {/* Fondo: aparece entero al instante, sin fade (evita el salto en hora/batería). */}
        <button
          type="button"
          aria-label="Cerrar"
          tabIndex={-1}
          onClick={onClose}
          className="absolute inset-0 bg-[rgba(15,14,26,.35)]"
        />

        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <div
            role="presentation"
            className={`relative z-10 flex w-full max-w-[440px] animate-sheetEnter flex-col overflow-hidden rounded-t-sheet bg-white shadow-[0_-20px_60px_rgba(15,14,26,.18)] ${className}`}
            style={{
              height,
              maxHeight: '92dvh',
              transition: dragging ? 'none' : 'height .28s cubic-bezier(.22,.92,.28,1)',
            }}
          >
            {!grabHeader && (
              <SheetGrab className="flex min-h-[56px] shrink-0 items-center justify-center px-6 py-3">
                <SheetHandle />
              </SheetGrab>
            )}
            <div className="flex min-h-0 flex-1 flex-col">
              {children}
            </div>
          </div>
        </div>
      </div>
    </SheetGrabContext.Provider>,
    document.body,
  );
}
