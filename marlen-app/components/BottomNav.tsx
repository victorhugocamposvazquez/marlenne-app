'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Home, Calendar, Users, Settings, Plus } from 'lucide-react';
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

  const Item = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => {
    const active = on(href);
    return (
      <Link
        href={href}
        className="flex min-h-[44px] flex-col items-center justify-center gap-px no-underline"
        style={{ color: active ? 'rgb(var(--c-ink))' : 'rgb(var(--c-ink-3))' }}
      >
        <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
        <span className={`text-[12px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
      </Link>
    );
  };

  const showClientas = workspace !== 'personal' && role !== 'provider';
  const cols = (workspace === 'personal' ? 4 : showClientas ? 5 : 4);

  const create = () => {
    if (workspace === 'personal') {
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

  const showFab = workspace === 'personal'
    ? on('/hoy') || on('/calendario')
    : on('/agenda') || on('/clientas');
  const fabLabel = workspace === 'personal'
    ? 'Nueva tarea'
    : on('/clientas')
      ? 'Nueva clienta'
      : 'Nueva cita';

  return (
    <nav className="relative z-40 shrink-0 border-t border-surface-line bg-white px-1 pt-2.5 pb-[max(2px,env(safe-area-inset-bottom))] standalone:pb-[max(4px,calc(env(safe-area-inset-bottom)-12px))]">
      {showFab && (
        <button
          type="button"
          aria-label={fabLabel}
          onClick={create}
          className="absolute bottom-[calc(100%+10px)] right-4 grid h-14 w-14 place-items-center rounded-full bg-grad text-white shadow-[0_10px_24px_rgba(200,30,143,0.45)] motion-safe:active:scale-[.96]"
        >
          <Plus size={26} strokeWidth={2.4} />
        </button>
      )}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        <Item href="/hoy" icon={Home} label="Hoy" />
        {workspace === 'personal'
          ? <Item href="/calendario" icon={Calendar} label="Calendario" />
          : <Item href="/agenda" icon={Calendar} label="Agenda" />}
        {showClientas && <Item href="/clientas" icon={Users} label="Clientas" />}
        <Item href="/ajustes" icon={Settings} label="Ajustes" />
        {account}
      </div>
    </nav>
  );
}
