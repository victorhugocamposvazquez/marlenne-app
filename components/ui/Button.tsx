'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'lg' | 'md' | 'sm';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-grad text-white shadow-btn',
  secondary: 'border border-surface-line bg-surface-card text-ink shadow-card',
  danger: 'bg-danger text-white',
  ghost: 'text-v-d',
};

const SIZES: Record<Size, string> = {
  lg: 'min-h-[48px] px-4 py-3.5 text-body-lg',
  md: 'min-h-[44px] px-4 py-3 text-body',
  sm: 'min-h-[40px] px-3.5 py-2.5 text-label',
};

export function buttonClass({
  variant = 'primary',
  size = 'md',
  full,
  className = '',
}: {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
} = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-field font-extrabold transition motion-safe:active:scale-[.98] disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  full,
  className = '',
  type = 'button',
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  full?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, full, className })}
      {...rest}
    />
  );
}
