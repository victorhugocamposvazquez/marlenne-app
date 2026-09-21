import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { circleOutlineCls } from '@/components/ui/IconButton';

/** Márgenes de cabecera de pantalla (referencia: Clientas). */
export const screenHeaderCls = 'shrink-0 px-6 pb-2 pt-5';

/** Título a la izquierda, iconos a la derecha; gap mínimo sin hueco muerto en medio. */
export const headerTitleRowCls = 'flex w-full items-center justify-between gap-3';

/** Columna derecha: calendario, +, campana… sin saltos entre pantallas. */
export const headerActionsCls = 'flex shrink-0 items-center gap-2';

/** Mes en agenda: fluido respecto al ancho útil (min(100vw, 440px)), ref. 30px. */
export const screenTitleCls = 'text-agenda-month font-bold tracking-[-.03em]';

/** Chevron del mes: escala con el título (2/3 em → ~20px @ 30px). */
export const screenTitleChevronCls = 'size-[0.667em] shrink-0 text-ink-3';

export function HeaderTitleRow({
  title, actions,
}: {
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={headerTitleRowCls}>
      <div className="min-w-0 shrink">{title}</div>
      {actions != null && <div className={headerActionsCls}>{actions}</div>}
    </div>
  );
}

/** Botón circular de cabecera: 48×48, borde 2px, misma posición en todas las pantallas. */
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
      className={`${circleOutlineCls} h-12 w-12 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
