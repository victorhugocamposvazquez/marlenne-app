'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Building2, ListTodo, LogOut, Settings, User } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { LocalSheet } from '@/components/Sheet';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';

function close() {
  shallowSet({ perfil: null });
}

export default function ProfileSheetHost({
  fullName,
  email,
  companyName,
}: {
  fullName: string;
  email: string;
  companyName: string;
  /** @deprecated ya no hay modo workspace */
  workspace?: string;
  hasPersonal?: boolean;
}) {
  const perfil = useShallowParam('perfil');
  const open = perfil === '1';

  if (!open) return null;

  const actionRow = (children: ReactNode, className = '') => (
    <div className={`flex min-h-[56px] w-full items-center gap-4 rounded-row bg-surface-soft px-5 py-3.5 text-body-lg font-semibold text-ink ${className}`}>
      {children}
    </div>
  );

  const navRow = (
    href: string,
    label: string,
    hint: string,
    Icon: typeof Building2,
    accent?: 'blue' | 'brand',
  ) => (
    <Link href={href} onClick={close} className="no-underline">
      <div
        className={`flex w-full items-center gap-4 rounded-row px-5 py-4 text-left transition motion-safe:active:scale-[.99] ${
          accent === 'blue' ? 'bg-[#E8F2FF] text-v-2' : accent === 'brand' ? 'bg-v-soft text-v' : 'bg-surface-soft text-ink'
        }`}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-white/70">
          <Icon
            size={22}
            strokeWidth={2}
            className={accent === 'blue' ? 'text-v-2' : accent === 'brand' ? 'text-v' : 'text-ink'}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body-lg font-bold">{label}</span>
          <span className={`mt-0.5 block truncate text-body ${accent ? 'opacity-80' : 'text-ink-2'}`}>
            {hint}
          </span>
        </span>
      </div>
    </Link>
  );

  return (
    <LocalSheet
      open
      onClose={close}
      title="Perfil"
      initialHeight="mid"
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-3 rounded-row bg-surface-soft px-4 py-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-white text-ink-2">
            <User size={22} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold leading-tight">{fullName}</div>
            {email && <div className="truncate text-[13px] font-medium text-ink-2">{email}</div>}
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-caption font-bold uppercase tracking-[.03em] text-ink-2">Tareas</p>
          <div className="flex flex-col gap-2.5">
            {navRow('/hoy', 'Trabajo', companyName || 'Marlén', Building2, 'brand')}
            {navRow('/tareas?scope=personal', 'Personal', 'Solo tú', ListTodo, 'blue')}
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-caption font-bold uppercase tracking-[.03em] text-ink-2">Cuenta</p>
          <div className="flex flex-col gap-2.5">
            <Link href="/ajustes/cuenta" onClick={close} className="no-underline">
              {actionRow(
                <>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-white">
                    <Settings size={22} strokeWidth={2} className="text-ink" />
                  </span>
                  Tu cuenta
                </>,
              )}
            </Link>
            <form action={signOut}>
              <button type="submit" className="w-full text-left">
                {actionRow(
                  <>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-white">
                      <LogOut size={22} strokeWidth={2} className="text-ink" />
                    </span>
                    Cerrar sesión
                  </>,
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </LocalSheet>
  );
}
