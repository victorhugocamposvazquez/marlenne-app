'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  cloneElement, isValidElement, useEffect, useState,
  type ReactElement, type ReactNode,
} from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Home, ListTodo, Plus,
  Receipt, RefreshCw, Settings, Sparkles, Users,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { usePageRefresh } from '@/components/RefreshButton';
import { shallowSet } from '@/hooks/useShallowQuery';

const EXPAND_KEY = 'marlen.sidenav.expanded';
const EXPAND_MQ = '(min-width: 1100px)';

function isNavActive(path: string, href: string) {
  if (href === '/ajustes') {
    if (path === '/ajustes') return true;
    if (!path.startsWith('/ajustes/')) return false;
    // Servicios tiene entrada propia en el menú.
    return !path.startsWith('/ajustes/servicios');
  }
  if (href === '/ajustes/servicios') return path.startsWith('/ajustes/servicios');
  return path === href || path.startsWith(`${href}/`);
}

export default function SideNav({
  role,
  account,
}: {
  role: string;
  account?: ReactNode;
}) {
  const path = usePathname();
  const { refresh, hardReload, busy } = usePageRefresh();
  const showClientas = role !== 'provider';

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EXPAND_KEY);
      if (stored === '1') setExpanded(true);
      else if (stored === '0') setExpanded(false);
      else setExpanded(window.matchMedia(EXPAND_MQ).matches);
    } catch {
      setExpanded(window.matchMedia(EXPAND_MQ).matches);
    }
  }, []);

  const toggle = () => {
    setExpanded(prev => {
      const next = !prev;
      try { localStorage.setItem(EXPAND_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const Item = ({
    href, icon: Icon, label,
  }: {
    href: string;
    icon: typeof Home;
    label: string;
  }) => {
    const active = isNavActive(path, href);
    return (
      <Link
        href={href}
        aria-label={label}
        title={expanded ? undefined : label}
        aria-current={active ? 'page' : undefined}
        className={`flex h-11 items-center rounded-[13px] no-underline transition-colors ${
          expanded ? 'w-full gap-3 px-3' : 'w-11 justify-center'
        } ${active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-surface-soft'}`}
      >
        <Icon size={20} strokeWidth={active ? 2.2 : 1.9} className="shrink-0" />
        {expanded && (
          <span className={`truncate text-[14.5px] ${active ? 'font-bold' : 'font-semibold'}`}>
            {label}
          </span>
        )}
      </Link>
    );
  };

  const Soon = ({ icon: Icon, label }: { icon: typeof Home; label: string }) => (
    <span
      role="link"
      aria-disabled
      aria-label={`${label} (próximamente)`}
      title={`${label} · próximamente`}
      className={`flex h-11 items-center rounded-[13px] text-ink-3/55 ${
        expanded ? 'w-full gap-3 px-3' : 'w-11 justify-center'
      }`}
    >
      <Icon size={20} strokeWidth={1.9} className="shrink-0" />
      {expanded && <span className="truncate text-[14.5px] font-semibold">{label}</span>}
    </span>
  );

  const inSection = (p: string) => path === p || path.startsWith(`${p}/`);

  const create = () => {
    if (inSection('/tareas')) {
      shallowSet({ tarea: '1', tscope: 'centro' });
      return;
    }
    if (inSection('/clientas')) {
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

  const showCreate =
    inSection('/agenda') || inSection('/clientas') || inSection('/hoy') || inSection('/tareas');
  const createLabel = inSection('/tareas')
    ? 'Nueva tarea'
    : inSection('/clientas')
      ? 'Nueva clienta'
      : 'Nueva cita';

  const accountNode =
    account && isValidElement(account)
      ? cloneElement(account as ReactElement<{ expanded?: boolean }>, { expanded })
      : account;

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-surface-line bg-white py-4 pt-[max(16px,env(safe-area-inset-top))] transition-[width] duration-200 ease-out ${
        expanded ? 'w-[232px] items-stretch px-3' : 'w-[68px] items-center px-2'
      }`}
    >
      <div className={`mb-5 flex items-center ${expanded ? 'gap-2.5 px-1' : 'justify-center'}`}>
        <Link href="/hoy" aria-label="Marlén" className="grid shrink-0 place-items-center no-underline">
          <BrandLogo size={34} alt="" />
        </Link>
        {expanded && (
          <Link href="/hoy" className="min-w-0 truncate text-[18px] font-extrabold tracking-[-0.03em] text-ink no-underline">
            marlén
          </Link>
        )}
      </div>

      <nav className={`flex flex-1 flex-col gap-1 overflow-y-auto ${expanded ? '' : 'items-center'}`}>
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
          aria-label={createLabel}
          onClick={create}
          className={`mb-2 flex h-11 items-center justify-center rounded-pill text-white ${
            expanded ? 'w-full gap-2 px-3' : 'w-11'
          } ${inSection('/tareas') ? 'bg-v-2' : 'bg-grad'}`}
        >
          <Plus size={18} strokeWidth={2.4} className="shrink-0" />
          {expanded && <span className="text-[14px] font-bold">{createLabel}</span>}
        </button>
      )}

      <div className={`mb-2 flex flex-col gap-1 ${expanded ? '' : 'items-center'}`}>
        <button
          type="button"
          aria-label="Actualizar página"
          title="Actualizar (F5). Mayús+clic o Mayús+F5: recarga completa"
          disabled={busy}
          onClick={e => {
            if (e.shiftKey) hardReload();
            else refresh();
          }}
          className={`flex h-11 items-center rounded-[13px] text-ink-2 transition-colors hover:bg-surface-soft disabled:opacity-50 ${
            expanded ? 'w-full gap-3 px-3' : 'w-11 justify-center'
          }`}
        >
          <RefreshCw
            size={20}
            strokeWidth={1.9}
            className={`shrink-0 ${busy ? 'motion-safe:animate-spin' : ''}`}
          />
          {expanded && <span className="text-[14.5px] font-semibold">Actualizar</span>}
        </button>
        <button
          type="button"
          aria-label={expanded ? 'Contraer menú' : 'Expandir menú'}
          title={expanded ? 'Contraer' : 'Expandir'}
          aria-expanded={expanded}
          onClick={toggle}
          className={`flex h-11 items-center rounded-[13px] text-ink-2 transition-colors hover:bg-surface-soft ${
            expanded ? 'w-full gap-3 px-3' : 'w-11 justify-center'
          }`}
        >
          {expanded
            ? <ChevronLeft size={20} strokeWidth={1.9} className="shrink-0" />
            : <ChevronRight size={20} strokeWidth={1.9} />}
          {expanded && <span className="text-[14.5px] font-semibold">Contraer</span>}
        </button>
      </div>

      <div className={`flex border-t border-surface-line pt-3 ${expanded ? 'justify-stretch' : 'justify-center'}`}>
        {accountNode}
      </div>
    </aside>
  );
}
