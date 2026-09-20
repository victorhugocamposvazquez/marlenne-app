import type { ReactNode } from 'react';

/** Título de bloque en Ajustes: negro suave, sin rosa ni micro-uppercase. */
export const ajustesSectionTitleCls = 'mb-3 text-body font-semibold text-ink-2';

/** Tarjeta de lista / formulario en Ajustes. */
export const ajustesCardCls = 'rounded-card bg-surface-soft px-4';

export default function AjustesSection({
  title,
  children,
  className = '',
  cardClassName = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <section className={`mt-8 ${className}`}>
      <h2 className={ajustesSectionTitleCls}>{title}</h2>
      <div className={`${ajustesCardCls} ${cardClassName}`}>{children}</div>
    </section>
  );
}
