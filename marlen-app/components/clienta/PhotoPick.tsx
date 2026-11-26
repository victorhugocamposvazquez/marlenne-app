'use client';

import type { ChangeEvent, ReactNode } from 'react';
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
  const take = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Hit
        label={`Hacer foto de ${label}`}
        caption="Hacer foto"
        capture="environment"
        disabled={disabled}
        onChange={take}
        icon={<Camera size={15} strokeWidth={2.3} aria-hidden />}
        className="bg-grad text-white"
      />
      <Hit
        label={`Galería de ${label}`}
        caption="Galería"
        disabled={disabled}
        onChange={take}
        icon={<Images size={15} strokeWidth={2.3} aria-hidden />}
        className="border border-surface-line bg-surface-card text-ink shadow-card"
      />
    </div>
  );
}

function Hit({
  label, caption, capture, disabled, onChange, icon, className,
}: {
  label: string;
  caption: string;
  capture?: 'environment';
  disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  icon: ReactNode;
  className: string;
}) {
  return (
    <label
      className={`relative inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 overflow-hidden rounded-chip px-2.5 text-caption font-extrabold ${className} ${disabled ? 'opacity-40' : 'motion-safe:active:scale-[.98]'}`}
    >
      <input
        type="file"
        accept="image/*,.heic,.heif"
        capture={capture}
        disabled={disabled}
        aria-label={label}
        onChange={onChange}
        className="absolute inset-0 z-10 block h-full w-full cursor-pointer opacity-[0.02] disabled:pointer-events-none"
      />
      {icon}
      <span aria-hidden>{caption}</span>
    </label>
  );
}
