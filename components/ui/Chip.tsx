'use client';

import type { ButtonHTMLAttributes } from 'react';

/**
 * Chip de filtro: el estado activo usa el degradado de marca.
 * Para segmented controls (Día/Semana, tabs) usar Segmented.
 */
export default function Chip({
  active,
  className = '',
  type = 'button',
  ...rest
}: { active?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-pill px-3.5 py-2 text-label font-bold transition motion-safe:active:scale-[.97] ${
        active ? 'bg-grad text-white shadow-pill' : 'border border-surface-line bg-surface-card text-ink-2'
      } ${className}`}
      {...rest}
    />
  );
}
