import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { circleOutlineCls } from '@/components/ui/IconButton';

/** Márgenes de cabecera de pantalla (referencia: Clientas). */
export const screenHeaderCls = 'shrink-0 px-6 pb-2 pt-5';

/** Fila título + acciones: aire fijo entre texto e iconos en todos los dispositivos. */
export const headerTitleRowCls = 'flex items-center gap-4';

/** Columna derecha: calendario, +, campana… sin saltos entre pantallas. */
export const headerActionsCls = 'flex shrink-0 items-center gap-2';

/** Mes / título de cabecera con iconos al lado (20px, no h1 de 28px). */
export const screenTitleCls = 'text-title font-bold leading-tight tracking-[-.03em]';

export function HeaderTitleRow({
  title, actions,
}: {
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={headerTitleRowCls}>
      <div className="min-w-0 flex-1">{title}</div>
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
      className={`${circleOutlineCls} h-11 w-11 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
