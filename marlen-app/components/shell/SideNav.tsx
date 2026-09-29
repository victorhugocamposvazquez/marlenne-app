'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Calendar, Home, ListTodo, Plus, Settings, Sparkles, Users } from 'lucide-react';
import { shallowSet } from '@/hooks/useShallowQuery';

export default function SideNav({
  role,
  account,
}: {
  role: string;
  account?: ReactNode;
}) {
  const path = usePathname();
  const on = (p: string) => path.startsWith(p);
  const showClientas = role !== 'provider';

  const Item = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => {
    const active = on(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-row px-3 py-2.5 no-underline transition-colors ${
          active ? 'bg-ink font-bold text-white' : 'font-medium text-ink-2 hover:bg-surface-soft'
        }`}
      >
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
        <span className="text-[14.5px]">{label}</span>
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
    if (on('/ajustes/servicios')) {
      return;
    }
    shallowSet({
      new: '1',
      con: null, hora: null, nombre: null, servicio: null, client: null,
      wait: null, block: null, bloqueo: null, appt: null, close: null, alta: null, miembro: null,
    });
  };

  const fabLabel = on('/tareas')
    ? 'Nueva tarea'
    : on('/clientas')
      ? 'Nueva clienta'
      : 'Nueva cita';
  const showCreate = on('/agenda') || on('/clientas') || on('/hoy') || on('/tareas');

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-surface-line bg-white px-3 py-4 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="mb-5 flex items-center gap-2.5 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-grad text-[11px] font-extrabold text-white">
          m
        </span>
        <p className="text-[17px] font-extrabold tracking-[-0.03em] text-ink">marlén</p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        <Item href="/hoy" icon={Home} label="Hoy" />
        <Item href="/agenda" icon={Calendar} label="Agenda" />
        {showClientas && <Item href="/clientas" icon={Users} label="Clientas" />}
        <Item href="/ajustes/servicios" icon={Sparkles} label="Servicios" />
        <Item href="/tareas" icon={ListTodo} label="Tareas" />
        <Item href="/ajustes" icon={Settings} label="Ajustes" />
      </nav>

      {showCreate && (
        <button
          type="button"
          onClick={create}
          className={`mb-3 flex h-11 items-center justify-center gap-2 rounded-pill text-[14.5px] font-bold text-white ${
            on('/tareas') ? 'bg-v-2' : 'bg-grad'
          }`}
        >
          <Plus size={18} strokeWidth={2.4} />
          {fabLabel}
        </button>
      )}

      <div className="border-t border-surface-line pt-3">
        {account}
      </div>
    </aside>
  );
}
