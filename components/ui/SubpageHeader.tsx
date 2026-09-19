import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

/** Cabecera fija: chevron atrás (estilo WhatsApp) y título. */
export default function SubpageHeader({
  href, back, title, leading, extra, children,
}: {
  href: string;
  back: string;
  title: string;
  leading?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 bg-surface-bg px-4 pb-2 pt-4">
        <div className="flex items-center gap-2.5">
          <Link
            href={href}
            aria-label={back}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-track text-ink motion-safe:active:scale-[.96]"
          >
            <ChevronLeft size={22} strokeWidth={2.4} aria-hidden />
          </Link>
          {leading}
          <h1 className="min-w-0 flex-1 truncate text-title font-bold leading-tight tracking-[-.02em]">
            {title}
          </h1>
          {extra}
        </div>
      </header>
      <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-fab pt-4">
        {children}
      </div>
    </div>
  );
}
