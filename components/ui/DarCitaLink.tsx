import Link from 'next/link';
import { pillOutlineCls } from '@/components/ui/IconButton';

type Props = {
  href: string;
  /** Accesibilidad; si no hay nombre de clienta, algo genérico. */
  ariaLabel: string;
  label?: string;
  className?: string;
};

/** Pastilla outline «Dar cita» — mismo aspecto en Clientas, Hoy y ficha. */
export default function DarCitaLink({
  href,
  ariaLabel,
  label = 'Dar cita',
  className = '',
}: Props) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`${pillOutlineCls} h-[38px] shrink-0 px-3.5 text-label font-semibold ${className}`}
    >
      {label}
    </Link>
  );
}
