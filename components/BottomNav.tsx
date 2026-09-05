'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';
import { Home, Calendar, Users, Settings, Plus } from 'lucide-react';
import { shallowSet } from '@/hooks/useShallowQuery';

const ACTIVE = 'rgb(var(--c-brand-deep))';
const IDLE = 'rgb(var(--c-ink-3))';

export default function BottomNav({ role }: { role: string }) {
  const path = usePathname();
  const on = (p: string) => path.startsWith(p);

  const Item = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-1 py-1.5 text-caption font-bold"
      style={{ color: on(href) ? ACTIVE : IDLE }}
    >
      <Icon size={21} strokeWidth={1.9} fill={on(href) ? 'rgb(var(--c-brand-soft))' : 'none'} />
      {label}
    </Link>
  );

  const openNew = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!path.startsWith('/agenda')) return;
    e.preventDefault();
    shallowSet({
      new: '1',
      con: null, hora: null, nombre: null, servicio: null, client: null,
      wait: null, block: null, bloqueo: null, appt: null, close: null,
    });
  };

  return (
    <nav className="relative z-10 shrink-0 border-t border-surface-line bg-surface-card shadow-nav pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center px-2.5 pb-1.5 pt-1.5">
        <Item href="/hoy" icon={Home} label="Hoy" />
        <Item href="/agenda" icon={Calendar} label="Agenda" />
        <Link
          href="/agenda?new=1"
          onClick={openNew}
          aria-label="Nueva cita"
          className="mx-1.5 grid h-14 w-14 shrink-0 place-items-center rounded-card bg-grad text-white shadow-btn transition motion-safe:hover:-translate-y-[3px] motion-safe:active:scale-[.96]"
        >
          <Plus size={26} strokeWidth={2.4} />
        </Link>
        {role !== 'provider' && <Item href="/clientas" icon={Users} label="Clientas" />}
        <Item href="/ajustes" icon={Settings} label="Ajustes" />
      </div>
    </nav>
  );
}
