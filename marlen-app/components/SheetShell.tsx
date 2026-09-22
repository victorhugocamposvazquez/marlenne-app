'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useRevealField } from '@/hooks/useRevealField';
import { useSheetResize, type SheetDetent } from '@/hooks/useSheetResize';

type GrabCtx = {
  onHandleDown: (e: React.PointerEvent) => void;
  dragging: boolean;
};

type RequestClose = (after?: () => void) => void;

const SheetGrabContext = createContext<GrabCtx | null>(null);
const SheetCloseContext = createContext<RequestClose>(() => {});

const OVERLAY_STYLE = {
  top: 'calc(-1 * env(safe-area-inset-top, 0px))',
  minHeight: 'calc(100dvh + env(safe-area-inset-top, 0px))',
} as const;

const noop = () => {};

function subscribeClient() {
  return noop;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/** Cierra con animación. Opcional: callback tras quitar el sheet de la URL. */
export function useSheetShellClose() {
  return useContext(SheetCloseContext);
}

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
  floorDetent,
  className = '',
  grabHeader = false,
}: {
  onClose: () => void;
  children: ReactNode;
  initialHeight?: SheetDetent;
  /** Tras teclado o resize automático, no bajar de este tope (el arrastre manual sí puede). */
  floorDetent?: SheetDetent;
  className?: string;
  grabHeader?: boolean;
}) {
  const isClient = useSyncExternalStore(subscribeClient, getClientSnapshot, getServerSnapshot);
  const panelRef = useRef<HTMLDivElement>(null);
  const afterCloseRef = useRef<(() => void) | null>(null);
  const finishedRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);

  const finishClose = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onClose();
    afterCloseRef.current?.();
    afterCloseRef.current = null;
  }, [onClose]);

  const requestClose = useCallback<RequestClose>((after) => {
    if (closing || finishedRef.current) return;
    afterCloseRef.current = after ?? null;
    setClosing(true);
  }, [closing]);

  const { height, dragging, onHandleDown } = useSheetResize(initialHeight, { floorDetent });
  useRevealField(panelRef, isClient);

  useLayoutEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!closing) return;
    const panel = panelRef.current;
    const onEnd = (e: AnimationEvent) => {
      if (e.target !== panel) return;
      finishClose();
    };
    panel?.addEventListener('animationend', onEnd);
    const t = window.setTimeout(finishClose, 320);
    return () => {
      panel?.removeEventListener('animationend', onEnd);
      window.clearTimeout(t);
    };
  }, [closing, finishClose]);

  if (!isClient) return null;

  const grabCtx: GrabCtx = { onHandleDown, dragging };

  return createPortal(
    <SheetGrabContext.Provider value={grabCtx}>
      <SheetCloseContext.Provider value={requestClose}>
        <div className="fixed inset-x-0 bottom-0 z-[60]" style={OVERLAY_STYLE}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[rgba(15,14,26,.18)]"
          />

          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <div
              ref={panelRef}
              role="presentation"
              className={`relative z-10 flex w-full max-w-[440px] flex-col overflow-hidden rounded-t-sheet bg-white shadow-[0_-20px_60px_rgba(15,14,26,.18)] ${closing ? 'animate-sheetExit' : ''} ${className}`}
              style={{
                height,
                maxHeight: '92dvh',
                transform: closing ? undefined : entered ? 'translateY(0)' : 'translateY(100%)',
                transition: dragging || closing
                  ? 'none'
                  : 'transform .34s cubic-bezier(.22,.92,.28,1), height .28s cubic-bezier(.22,.92,.28,1)',
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
      </SheetCloseContext.Provider>
    </SheetGrabContext.Provider>,
    document.body,
  );
}
