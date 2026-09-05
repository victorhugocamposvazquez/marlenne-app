import type { ReactNode } from 'react';
import BrandLogo from '@/components/BrandLogo';

/** Cabecera compartida de Login, Recuperar y confirmación pública. */
export default function PublicHero({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden px-6 pb-8 pt-11">
      <div className="absolute -right-[70px] -top-[90px] h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgb(var(--c-blob)),rgb(var(--c-bg))_70%)]" />
      <div className="relative">
        <BrandLogo
          size={56}
          alt=""
          className="mb-5 block drop-shadow-[0_10px_18px_rgba(182,33,200,0.35)]"
        />
        <div className="text-body font-semibold tracking-[.02em] text-v">{kicker}</div>
        <h1 className="mt-1 text-display font-extrabold leading-[1.15] tracking-[-.02em]">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}
