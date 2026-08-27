'use client';

import type { ButtonHTMLAttributes } from 'react';

type Tone = 'card' | 'soft' | 'ok' | 'danger' | 'ghost' | 'brand';

const TONES: Record<Tone, string> = {
  card: 'border border-surface-line bg-surface-card text-ink-2 shadow-card',
  soft: 'bg-v-soft text-v-d',
  ok: 'bg-ok-bg text-ok-fg',
  danger: 'bg-danger-bg text-danger-fg',
  ghost: 'text-ink-2',
  brand: 'bg-grad text-white shadow-btn',
};

/** Botón de icono con área táctil mínima de 44×44. `label` es obligatorio (aria-label). */
export default function IconButton({
  label,
  tone = 'card',
  className = '',
  type = 'button',
  children,
  ...rest
}: {
  label: string;
  tone?: Tone;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-icon transition motion-safe:active:scale-[.96] disabled:opacity-40 ${TONES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
