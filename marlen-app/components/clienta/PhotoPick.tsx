'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Images } from 'lucide-react';

const ACCEPT = 'image/*,.heic,.heif';

/**
 * Un solo botón; menú con cámara (`capture`) y galería (sin `capture`).
 * Acepta HEIC del iPhone.
 */
export default function PhotoPick({
  label,
  disabled,
  onFile,
  circle = false,
}: {
  label: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  /** Círculo para añadir junto a las fotos del tratamiento. */
  circle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const take = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setOpen(false);
    if (file) onFile(file);
  };

  const launch = (which: 'camera' | 'gallery') => {
    setOpen(false);
    window.setTimeout(() => {
      (which === 'camera' ? cameraRef : galleryRef).current?.click();
    }, 80);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        ref={cameraRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        disabled={disabled}
        onChange={take}
        className="sr-only"
        tabIndex={-1}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        onChange={take}
        className="sr-only"
        tabIndex={-1}
      />
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={circle
          ? 'grid h-[88px] w-[88px] place-items-center rounded-full border border-dashed border-handle bg-surface-card text-v motion-safe:active:scale-[.98] disabled:opacity-40'
          : 'inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-chip border border-surface-line bg-surface-card px-2.5 text-caption font-extrabold text-ink shadow-card motion-safe:active:scale-[.98] disabled:opacity-40'}
      >
        <Camera size={circle ? 18 : 15} strokeWidth={2.3} className="text-v" aria-hidden />
        {circle ? <span className="sr-only">Añadir foto ({label})</span> : (
          <>
            Añadir foto
            <span className="sr-only"> ({label})</span>
          </>
        )}
      </button>
      {open && (
        <ul
          role="menu"
          className={circle
            ? 'absolute bottom-[calc(100%+6px)] left-0 z-30 w-44 overflow-hidden rounded-row border border-surface-line bg-surface-card py-1 shadow-lift'
            : 'absolute bottom-[calc(100%+6px)] left-0 right-0 z-30 overflow-hidden rounded-row border border-surface-line bg-surface-card py-1 shadow-lift'}
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => launch('camera')}
              className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-caption font-extrabold text-ink motion-safe:active:bg-surface-soft disabled:opacity-40"
            >
              <Camera size={16} strokeWidth={2.2} className="shrink-0 text-v" aria-hidden />
              Hacer foto
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => launch('gallery')}
              className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-caption font-extrabold text-ink motion-safe:active:bg-surface-soft disabled:opacity-40"
            >
              <Images size={16} strokeWidth={2.2} className="shrink-0 text-v" aria-hidden />
              Galería
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}