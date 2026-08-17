'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Users, Menu, Plus } from 'lucide-react';

const ACTIVE = '#7C3AED';
const IDLE = '#9B96B8';

export default function BottomNav({ role }: { role: string }) {
  const path = usePathname();
  const on = (p: string) => path.startsWith(p);

  const Item = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-1 py-1.5 text-[10.5px] font-bold"
      style={{ color: on(href) ? ACTIVE : IDLE }}
    >
      <Icon size={21} strokeWidth={1.9} fill={on(href) ? '#EDE9FE' : 'none'} />
      {label}
    </Link>
  );

  return (
    <nav className="relative z-10 flex shrink-0 items-center border-t border-surface-line bg-white px-2.5 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 shadow-nav">
      <Item href="/hoy" icon={Home} label="Hoy" />
      <Item href="/agenda" icon={Calendar} label="Agenda" />
      <Link
        href="/agenda?new=1"
        aria-label="Nueva cita"
        className="mx-1.5 grid h-14 w-14 shrink-0 place-items-center rounded-[19px] bg-grad text-white shadow-btn transition hover:-translate-y-[3px]"
      >
        <Plus size={26} strokeWidth={2.4} />
      </Link>
      {role !== 'provider' && <Item href="/clientas" icon={Users} label="Clientas" />}
      <Item href="/ajustes" icon={Menu} label="Más" />
    </nav>
  );
}
