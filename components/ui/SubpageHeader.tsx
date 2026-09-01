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
      <header className="shrink-0 border-b border-surface-line bg-surface-bg px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Link
            href={href}
            aria-label={back}
            className="-ml-1 grid h-11 w-11 shrink-0 place-items-center text-v-d motion-safe:active:opacity-70"
          >
            <ChevronLeft size={32} strokeWidth={2.4} aria-hidden />
          </Link>
          {leading}
          <h1 className="min-w-0 flex-1 truncate text-title font-extrabold leading-tight tracking-[-.02em]">
            {title}
          </h1>
          {extra}
        </div>
      </header>
      <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-4">
        {children}
      </div>
    </div>
  );
}
