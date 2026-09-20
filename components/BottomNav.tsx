'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';
import { Home, Calendar, Users, Settings, Plus } from 'lucide-react';
import { circleOutlineCls } from '@/components/ui/IconButton';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';

export default function BottomNav({ role }: { role: string }) {
  const path = usePathname();
  const creating = useShallowParam('new');
  const editing = useShallowParam('appt');
  const addingMember = useShallowParam('miembro');
  const on = (p: string) => path.startsWith(p);
  if (creating === '1' || editing || addingMember === '1') return null;

  const Item = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-1 py-1 text-[12px] font-bold"
      style={{ color: on(href) ? 'rgb(var(--c-ink))' : 'rgb(var(--c-ink-3))' }}
    >
      <Icon size={22} strokeWidth={2.2} />
      {label}
    </Link>
  );

  const onClientas = on('/clientas');
  const onEquipo = on('/ajustes/equipo');
  const fabHref = onClientas
    ? '/clientas?alta=1'
    : onEquipo && role === 'admin'
      ? '/ajustes/equipo?miembro=1'
      : '/agenda?new=1';
  const fabLabel = onClientas
    ? 'Nueva clienta'
    : onEquipo && role === 'admin'
      ? 'Nueva persona'
      : 'Nueva cita';

  const openFab = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!on('/agenda') && !onClientas && !(onEquipo && role === 'admin')) return;
    e.preventDefault();
    if (onClientas) {
      shallowSet({
        alta: '1',
        new: null, con: null, hora: null, nombre: null, servicio: null, client: null,
        wait: null, block: null, bloqueo: null, appt: null, close: null, miembro: null,
      });
      return;
    }
    if (onEquipo && role === 'admin') {
      shallowSet({
        miembro: '1',
        new: null, con: null, hora: null, nombre: null, servicio: null, client: null,
        wait: null, block: null, bloqueo: null, appt: null, close: null, alta: null,
      });
      return;
    }
    shallowSet({
      new: '1',
      con: null, hora: null, nombre: null, servicio: null, client: null,
      wait: null, block: null, bloqueo: null, appt: null, close: null, alta: null, miembro: null,
    });
  };

  return (
    <nav className="relative z-10 shrink-0 border-t border-surface-line bg-white pb-[env(safe-area-inset-bottom)] standalone:pb-[max(6px,calc(env(safe-area-inset-bottom)-12px))]">
      <div className="flex items-start px-2 pb-2 pt-3">
        <Item href="/hoy" icon={Home} label="Hoy" />
        <Item href="/agenda" icon={Calendar} label="Agenda" />
        <Link
          href={fabHref}
          onClick={openFab}
          aria-label={fabLabel}
          className={`mx-1.5 h-12 w-12 ${circleOutlineCls}`}
        >
          <Plus size={22} strokeWidth={2.2} />
        </Link>
        {role !== 'provider' && <Item href="/clientas" icon={Users} label="Clientas" />}
        <Item href="/ajustes" icon={Settings} label="Ajustes" />
      </div>
    </nav>
  );
}
