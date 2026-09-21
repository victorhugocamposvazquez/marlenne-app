import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { circleOutlineCls } from '@/components/ui/IconButton';

/** Márgenes de cabecera: escala con el ancho del shell (cqw), no vw. */
export const screenHeaderCls = 'app-screen-x shrink-0 pb-2 pt-5';

/** Título a la izquierda, iconos a la derecha; gap mínimo sin hueco muerto en medio. */
export const headerTitleRowCls = 'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-[clamp(0.375rem,2cqw,0.75rem)]';

/** Columna derecha: calendario, +, campana… sin saltos entre pantallas. */
export const headerActionsCls = 'flex shrink-0 items-center gap-[clamp(0.25rem,1.818cqw,0.5rem)]';

/** Mes en agenda: escala con el shell (@container). Ref. 28px @ 440px. */
export const screenTitleCls = 'text-agenda-month font-bold tracking-[-.03em]';

/** Chevron del mes: escala con el título (2/3 em). */
export const screenTitleChevronCls = 'size-[0.667em] shrink-0 text-ink-3';

export function HeaderTitleRow({
  title, actions,
}: {
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={headerTitleRowCls}>
      <div className="min-w-0">{title}</div>
      {actions != null && <div className={headerActionsCls}>{actions}</div>}
    </div>
  );
}

/** Botón circular de cabecera: escala con el shell; misma posición en todas las pantallas. */
export function HeaderIconButton({
  label,
  className = '',
  type = 'button',
  children,
  ...rest
}: {
  label: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`app-header-icon-btn ${circleOutlineCls} grid shrink-0 place-items-center ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
