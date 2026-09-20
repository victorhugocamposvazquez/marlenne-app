'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ink' | 'outline';
type Size = 'lg' | 'md' | 'sm';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-grad text-white disabled:bg-none disabled:bg-surface-line disabled:text-ink-3',
  secondary: 'bg-surface-soft text-ink',
  ink: 'bg-v-2 text-white',
  outline: 'border-2 border-ink bg-transparent text-ink',
  danger: 'bg-danger text-white',
  ghost: 'text-v-d',
};

const SIZES: Record<Size, string> = {
  lg: 'min-h-[58px] px-5 text-[17px]',
  md: 'min-h-[50px] px-4 text-body-lg',
  sm: 'min-h-[38px] px-3.5 text-label',
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
  return `inline-flex items-center justify-center gap-2 rounded-pill font-bold transition motion-safe:active:scale-[.98] disabled:opacity-100 ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`;
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
