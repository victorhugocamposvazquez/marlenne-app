'use client';

import { useRef, type ChangeEvent } from 'react';
import { Camera, Images } from 'lucide-react';

/** Cámara y galería por separado: `capture` en un solo input tapa el rollo en el móvil. */
export default function PhotoPick({
  label,
  disabled,
  onFile,
}: {
  label: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const take = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={take}
        className="sr-only"
        tabIndex={-1}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={take}
        className="sr-only"
        tabIndex={-1}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-chip bg-grad px-2.5 text-caption font-extrabold text-white shadow-btn motion-safe:active:scale-[.98] disabled:opacity-40"
      >
        <Camera size={15} strokeWidth={2.3} aria-hidden />
        Hacer foto
        <span className="sr-only"> de {label}</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => galleryRef.current?.click()}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-chip border border-surface-line bg-surface-card px-2.5 text-caption font-extrabold text-ink shadow-card motion-safe:active:scale-[.98] disabled:opacity-40"
      >
        <Images size={15} strokeWidth={2.3} aria-hidden />
        Galería
        <span className="sr-only"> de {label}</span>
      </button>
    </div>
  );
}
