import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

/** Cabecera fija y baja: atrás y título en la misma fila. */
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
      <header className="shrink-0 border-b border-surface-line bg-surface-bg px-4 py-2">
        <div className="flex items-center gap-2">
          <Link
            href={href}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-chip bg-v-soft px-2.5 text-label font-bold text-v-d motion-safe:active:scale-[.97]"
          >
            <ArrowLeft size={16} strokeWidth={2.4} aria-hidden />
            {back}
          </Link>
          {leading}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-title font-extrabold tracking-[-.02em]">{title}</h1>
            {subtitle && (
              <p className="truncate text-caption font-medium text-ink-2">{subtitle}</p>
            )}
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
