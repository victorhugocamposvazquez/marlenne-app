'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Calendar, Clock, Home, ListTodo, Plus, Receipt, Settings, Sparkles, Users,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import RefreshButton, { usePageRefresh } from '@/components/RefreshButton';
import { shallowSet } from '@/hooks/useShallowQuery';

export default function SideNav({
  role,
  account,
}: {
  role: string;
  account?: ReactNode;
}) {
  const path = usePathname();
  // Atajos F5 / ⌘R en PWA (sin chrome del navegador).
  usePageRefresh();
  const on = (p: string) => path.startsWith(p);
  const showClientas = role !== 'provider';

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

  const Soon = ({ icon: Icon, label }: { icon: typeof Home; label: string }) => (
    <span
      role="link"
      aria-disabled
      aria-label={`${label} (próximamente)`}
      title={`${label} · próximamente`}
      className="grid h-11 w-11 place-items-center rounded-[13px] text-ink-3/55"
    >
      <Icon size={20} strokeWidth={1.9} />
    </span>
  );

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

      <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
        <Item href="/hoy" icon={Home} label="Hoy" />
        <Item href="/agenda" icon={Calendar} label="Agenda" />
        {showClientas && <Item href="/clientas" icon={Users} label="Clientas" />}
        <Item href="/ajustes/servicios" icon={Sparkles} label="Servicios" />
        <Item href="/tareas" icon={ListTodo} label="Tareas" />
        <Soon icon={Receipt} label="Facturación" />
        <Soon icon={Clock} label="Fichar" />
        <Item href="/ajustes" icon={Settings} label="Ajustes" />
      </nav>

      {showCreate && (
        <button
          type="button"
          aria-label={on('/tareas') ? 'Nueva tarea' : on('/clientas') ? 'Nueva clienta' : 'Nueva cita'}
          onClick={create}
          className={`mb-2 grid h-11 w-11 place-items-center rounded-pill text-white ${
            on('/tareas') ? 'bg-v-2' : 'bg-grad'
          }`}
        >
          <Plus size={18} strokeWidth={2.4} />
        </button>
      )}

      <RefreshButton rail className="mb-2" />

      <div className="flex justify-center border-t border-surface-line pt-3">
        {account}
      </div>
    </aside>
  );
}
