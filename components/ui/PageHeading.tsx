import type { ReactNode } from 'react';

/** Título de pantalla: 28/700 y aire, como el sistema 5c. */
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
      <div className="min-w-0 flex-1">
        {kicker != null && kicker}
        <h1 className="text-h1 font-bold tracking-[-.03em]">{title}</h1>
        {subtitle != null && (
          <div className="mt-1 text-body font-normal text-ink-2">{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}
