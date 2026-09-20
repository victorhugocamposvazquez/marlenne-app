'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sheetDetents } from '@/lib/sheet-detent';
import { useSheetResize } from '@/hooks/useSheetResize';

function viewH() {
  if (typeof window === 'undefined') return 800;
  return window.visualViewport?.height ?? window.innerHeight;
}

export default function SheetShell({
  onClose,
  children,
  initialHeight = 'mid',
  className = '',
  handleClassName = 'shrink-0 px-5 pb-1 pt-3',
}: {
  onClose: () => void;
  children: ReactNode;
  initialHeight?: 'peek' | 'mid' | 'tall';
  className?: string;
  handleClassName?: string;
}) {
  const { height, dragging, onHandleDown } = useSheetResize(initialHeight, onClose);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  const vh = viewH();
  const [peek, , tall] = sheetDetents(vh);
  const span = Math.max(tall - peek, 1);
  const progress = Math.min(1, Math.max(0, (height - peek) / span));
  const backdropOpacity = 0.1 + progress * 0.28;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(15,14,26,.35)] transition-opacity duration-300 ease-out"
        style={{ opacity: entered ? backdropOpacity : 0 }}
      />

      <div
        role="presentation"
        className={`relative z-10 flex w-full max-w-[440px] flex-col overflow-hidden rounded-t-sheet bg-white shadow-[0_-20px_60px_rgba(15,14,26,.18)] ${className}`}
        style={{
          height,
          maxHeight: '92dvh',
          transform: entered ? 'translateY(0)' : 'translateY(100%)',
          transition: dragging
            ? 'none'
            : 'transform .34s cubic-bezier(.22,.92,.28,1), height .28s cubic-bezier(.22,.92,.28,1)',
        }}
      >
        <div
          className={handleClassName}
          style={{ touchAction: 'none' }}
          onPointerDown={onHandleDown}
        >
          <div className="mx-auto h-[5px] w-10 rounded-full bg-handle" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
