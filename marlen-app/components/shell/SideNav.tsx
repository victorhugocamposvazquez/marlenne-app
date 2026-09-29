'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Calendar, Home, MoreVertical, Plus, Settings, Sparkles, Users,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';

export default function SideNav({
  role,
  account,
}: {
  role: string;
  account?: ReactNode;
}) {
  const path = usePathname();
  const mas = useShallowParam('mas');
  const on = (p: string) => path.startsWith(p);
  const showClientas = role !== 'provider';
  const moreActive = on('/tareas') || mas === '1';

  const Item = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => {
    const active = on(href);
    return (
      <Link
        href={href}
        aria-label={label}
        title={label}
        className={`grid h-11 w-11 place-items-center rounded-[13px] no-underline transition-colors ${
          active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-surface-soft'
        }`}
      >
        <Icon size={20} strokeWidth={active ? 2.2 : 1.9} />
      </Link>
    );
  };

  const create = () => {
    if (on('/tareas')) {
      shallowSet({ tarea: '1', scope: 'centro' });
      return;
    }
    if (on('/clientas')) {
      shallowSet({
        alta: '1',
        new: null, con: null, hora: null, nombre: null, servicio: null, client: null,
        wait: null, block: null, bloqueo: null, appt: null, close: null, miembro: null,
      });
      return;
    }
    shallowSet({
      new: '1',
      con: null, hora: null, nombre: null, servicio: null, client: null,
      wait: null, block: null, bloqueo: null, appt: null, close: null, alta: null, miembro: null,
    });
  };

  const showCreate = on('/agenda') || on('/clientas') || on('/hoy') || on('/tareas');

  return (
    <aside className="flex w-[68px] shrink-0 flex-col items-center border-r border-surface-line bg-white px-2 py-4 pt-[max(16px,env(safe-area-inset-top))]">
      <Link href="/hoy" aria-label="Marlén" className="mb-5 grid place-items-center no-underline">
        <BrandLogo size={34} alt="" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1">
        <Item href="/hoy" icon={Home} label="Hoy" />
        <Item href="/agenda" icon={Calendar} label="Agenda" />
        {showClientas && <Item href="/clientas" icon={Users} label="Clientas" />}
        <Item href="/ajustes/servicios" icon={Sparkles} label="Servicios" />
        <button
          type="button"
          aria-label="Más"
          title="Más"
          aria-expanded={mas === '1'}
          onClick={() => shallowSet({ mas: '1' })}
          className={`grid h-11 w-11 place-items-center rounded-[13px] transition-colors ${
            moreActive ? 'bg-ink text-white' : 'text-ink-2 hover:bg-surface-soft'
          }`}
        >
          <MoreVertical size={20} strokeWidth={moreActive ? 2.2 : 1.9} />
        </button>
        <Item href="/ajustes" icon={Settings} label="Ajustes" />
      </nav>

      {showCreate && (
        <button
          type="button"
          aria-label={on('/tareas') ? 'Nueva tarea' : on('/clientas') ? 'Nueva clienta' : 'Nueva cita'}
          onClick={create}
          className={`mb-3 grid h-11 w-11 place-items-center rounded-pill text-white ${
            on('/tareas') ? 'bg-v-2' : 'bg-grad'
          }`}
        >
          <Plus size={18} strokeWidth={2.4} />
        </button>
      )}

      <div className="flex justify-center border-t border-surface-line pt-3">
        {account}
      </div>
    </aside>
  );
}
