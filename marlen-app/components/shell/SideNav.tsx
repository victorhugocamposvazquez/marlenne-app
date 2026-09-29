'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Calendar, Home, Plus, Settings, Users } from 'lucide-react';
import { shallowSet } from '@/hooks/useShallowQuery';
import type { WorkspaceKind } from '@/lib/personal-tasks';

export default function SideNav({
  role,
  workspace = 'company',
  account,
}: {
  role: string;
  workspace?: WorkspaceKind;
  account?: ReactNode;
}) {
  const path = usePathname();
  const on = (p: string) => path.startsWith(p);
  const personal = workspace === 'personal';
  const showClientas = !personal && role !== 'provider';
  const accent = personal ? 'rgb(var(--c-brand-2))' : 'rgb(var(--c-ink))';

  const Item = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => {
    const active = on(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-row px-3 py-2.5 no-underline transition-colors ${
          active ? 'bg-surface-soft font-bold' : 'font-medium hover:bg-surface-soft/70'
        }`}
        style={{ color: active ? accent : 'rgb(var(--c-ink-3))' }}
      >
        <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
        <span className="text-[15px]">{label}</span>
      </Link>
    );
  };

  const create = () => {
    if (personal) {
      shallowSet({ tarea: '1' });
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

  const fabLabel = personal
    ? 'Nueva tarea'
    : on('/clientas')
      ? 'Nueva clienta'
      : 'Nueva cita';

  const showCreate = personal || on('/agenda') || on('/clientas') || on('/hoy');

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-surface-line bg-white px-3 py-4 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="mb-5 px-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
          {personal ? 'Personal' : 'Salón'}
        </p>
        <p className="mt-0.5 text-[17px] font-extrabold tracking-[-0.02em] text-ink">Marlén</p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        <Item href="/hoy" icon={Home} label="Hoy" />
        {personal
          ? <Item href="/calendario" icon={Calendar} label="Calendario" />
          : <Item href="/agenda" icon={Calendar} label="Agenda" />}
        {showClientas && <Item href="/clientas" icon={Users} label="Clientas" />}
        <Item href="/ajustes" icon={Settings} label="Ajustes" />
      </nav>

      {showCreate && (
        <button
          type="button"
          onClick={create}
          className={`mb-3 flex h-11 items-center justify-center gap-2 rounded-pill text-[14.5px] font-bold text-white ${
            personal ? 'bg-v-2' : 'bg-grad'
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
