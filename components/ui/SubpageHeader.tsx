import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

/** Cabecera fija: atrás siempre a la vista, el cuerpo hace scroll debajo. */
export default function SubpageHeader({
  href, back, title, subtitle, leading, extra, children,
}: {
  href: string;
  back: string;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-surface-line bg-surface-bg px-5 pb-3 pt-4">
        <Link
          href={href}
          className="mb-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-chip bg-v-soft px-3 text-label font-bold text-v-d motion-safe:active:scale-[.97]"
        >
          <ArrowLeft size={16} strokeWidth={2.4} aria-hidden />
          {back}
        </Link>
        <div className="flex items-start gap-3">
          {leading}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-h1 font-extrabold tracking-[-.025em]">{title}</h1>
            {subtitle && <p className="mt-px text-body font-medium text-ink-2">{subtitle}</p>}
          </div>
          {extra}
        </div>
      </header>
      <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-4">
        {children}
      </div>
    </div>
  );
}
