'use client';

import Link from 'next/link';
import { Clock, ListTodo, Receipt } from 'lucide-react';
import { LocalSheet } from '@/components/Sheet';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';

function close() {
  shallowSet({ mas: null });
}

const ROWS = [
  {
    href: '/tareas',
    label: 'Tareas',
    hint: 'Del centro y tuyas',
    Icon: ListTodo,
    ready: true,
  },
  {
    href: '/finanzas' as string | null,
    label: 'Finanzas',
    hint: 'Citas, bonos y facturas',
    Icon: Receipt,
    ready: true,
  },
  {
    href: null as string | null,
    label: 'Fichaje',
    hint: 'Por hacer',
    Icon: Clock,
    ready: false,
  },
] as const;

export default function MoreSheetHost() {
  const mas = useShallowParam('mas');
  const open = mas === '1';
  if (!open) return null;

  return (
    <LocalSheet open onClose={close} title="Más" initialHeight="mid">
      <div className="flex flex-col gap-2.5 pb-2">
        {ROWS.map(row => {
          const inner = (
            <div
              className={`flex w-full items-center gap-4 rounded-row px-5 py-4 text-left ${
                row.ready
                  ? 'bg-surface-soft text-ink motion-safe:active:scale-[.99]'
                  : 'bg-surface-soft/70 text-ink-3'
              }`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-white">
                <row.Icon size={22} strokeWidth={2} className={row.ready ? 'text-ink' : 'text-ink-3'} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-lg font-bold">{row.label}</span>
                <span className={`mt-0.5 block text-body ${row.ready ? 'text-ink-2' : 'text-ink-3'}`}>
                  {row.hint}
                </span>
              </span>
            </div>
          );

          if (!row.ready || !row.href) {
            return (
              <div key={row.label} aria-disabled>
                {inner}
              </div>
            );
          }

          return (
            <Link key={row.label} href={row.href} onClick={close} className="no-underline">
              {inner}
            </Link>
          );
        })}
      </div>
    </LocalSheet>
  );
}
