'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { Home, Calendar, Users, Settings, Plus } from 'lucide-react';
import { circleOutlineCls } from '@/components/ui/IconButton';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';

export default function BottomNav({
  role,
  workspace = 'company',
  account,
}: {
  role: string;
  workspace?: 'company' | 'personal';
  account?: ReactNode;
}) {
  const path = usePathname();
  const creating = useShallowParam('new');
  const editing = useShallowParam('appt');
  const addingMember = useShallowParam('miembro');
  const task = useShallowParam('tarea');
  const on = (p: string) => path.startsWith(p);
  if (creating === '1' || editing || addingMember === '1' || task) return null;

  const tight = workspace === 'company';
  const Item = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => (
    <Link
      href={href}
      className={`flex flex-col items-center font-bold ${tight ? 'w-11 gap-0.5 text-[10px] leading-none' : 'min-w-0 flex-1 gap-1 py-1 text-[12px]'}`}
      style={{ color: on(href) ? 'rgb(var(--c-ink))' : 'rgb(var(--c-ink-3))' }}
    >
      <Icon size={tight ? 18 : 22} strokeWidth={2.2} />
      {label}
    </Link>
  );

  if (workspace === 'personal') {
    const openTask = (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      shallowSet({ tarea: '1' });
    };
    return (
      <nav className="relative z-40 shrink-0 border-t border-surface-line bg-white pb-[env(safe-area-inset-bottom)] standalone:pb-[max(6px,calc(env(safe-area-inset-bottom)-12px))]">
        <div className="flex items-start px-2 pb-2 pt-3">
          <Item href="/hoy" icon={Home} label="Hoy" />
          <Item href="/calendario" icon={Calendar} label="Calendario" />
          <Link
            href="/hoy?tarea=1"
            onClick={openTask}
            aria-label="Nueva tarea"
            className={`mx-1 h-11 w-11 ${circleOutlineCls}`}
          >
            <Plus size={20} strokeWidth={2.2} />
          </Link>
          <Item href="/ajustes" icon={Settings} label="Ajustes" />
          {account}
        </div>
      </nav>
    );
  }

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
    <nav className="relative z-40 shrink-0 border-t border-surface-line bg-white pb-[env(safe-area-inset-bottom)] standalone:pb-[max(6px,calc(env(safe-area-inset-bottom)-12px))]">
      <div className="flex items-start justify-center gap-1 px-1 pb-1.5 pt-2">
        <Item href="/hoy" icon={Home} label="Hoy" />
        <Item href="/agenda" icon={Calendar} label="Agenda" />
        <Link
          href={fabHref}
          onClick={openFab}
          aria-label={fabLabel}
          className={`mx-0.5 h-9 w-9 ${circleOutlineCls}`}
        >
          <Plus size={18} strokeWidth={2.2} />
        </Link>
        {role !== 'provider' && <Item href="/clientas" icon={Users} label="Clientas" />}
        <Item href="/ajustes" icon={Settings} label="Ajustes" />
        {account}
      </div>
    </nav>
  );
}
