import type { ReactNode } from 'react';
import BrandLogo from '@/components/BrandLogo';

/** Título de pantalla principal, con el logotipo oficial a la izquierda. */
export default function PageHeading({
  title,
  kicker,
  subtitle,
  children,
}: {
  title: ReactNode;
  kicker?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <BrandLogo
        size={40}
        alt=""
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        {kicker != null && kicker}
        <h1 className="text-h1 font-extrabold tracking-[-.025em]">{title}</h1>
        {subtitle != null && (
          <p className="mt-px text-body font-medium text-ink-2">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
