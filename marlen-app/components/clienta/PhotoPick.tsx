'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Images, Plus } from 'lucide-react';

const ACCEPT = 'image/*,.heic,.heif';

/**
 * Un solo botón; menú con cámara (`capture`) y galería (sin `capture`).
 * Acepta HEIC del iPhone.
 */
export default function PhotoPick({
  label,
  disabled,
  onFile,
}: {
  label: string;
  disabled?: boolean;
  onFile: (file: File) => void;
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
    (which === 'camera' ? cameraRef : galleryRef).current?.click();
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
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-chip bg-grad px-2.5 text-caption font-extrabold text-white motion-safe:active:scale-[.98] disabled:opacity-40"
      >
        <Plus size={15} strokeWidth={2.5} aria-hidden />
        Añadir foto
        <span className="sr-only"> ({label})</span>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-30 overflow-hidden rounded-row border border-surface-line bg-surface-card py-1 shadow-lift"
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