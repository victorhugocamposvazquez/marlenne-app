'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { CalendarPlus, LogOut, User } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { initials } from '@/lib/categories';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';

function close() {
  shallowSet({ perfil: null });
}

export default function AccountMenu({
  variant = 'tab',
  expanded = false,
  fullName,
  email,
}: {
  variant?: 'tab' | 'rail';
  /** SideNav expandido: muestra nombre junto al avatar. */
  expanded?: boolean;
  fullName?: string;
  email?: string;
}) {
  const perfil = useShallowParam('perfil');
  const open = perfil === '1';
  const mark = fullName ? initials(fullName) : null;

  useEffect(() => {
    if (!open || variant !== 'rail') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, variant]);

  if (variant === 'rail') {
    return (
      <div data-no-pull className={`relative ${expanded ? 'w-full' : ''}`}>
        <button
          type="button"
          aria-label="Perfil"
          aria-expanded={open}
          aria-haspopup="menu"
          title="Perfil"
          onClick={() => shallowSet({ perfil: open ? null : '1' })}
          className={`flex items-center rounded-[13px] transition-colors ${
            expanded ? 'h-11 w-full gap-3 px-2 hover:bg-surface-soft' : 'h-11 w-11 justify-center'
          } ${open ? 'bg-surface-soft' : ''}`}
        >
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-white">
            {mark || <User size={18} strokeWidth={2.1} />}
          </span>
          {expanded && (
            <span className="min-w-0 flex-1 truncate text-left text-[13.5px] font-bold text-ink">
              {fullName || 'Perfil'}
            </span>
          )}
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden
              onClick={close}
            />
            <div
              role="menu"
              className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[280px] rounded-[22px] bg-white p-2 shadow-[0_20px_54px_rgba(15,14,26,.22)]"
            >
              <div className="flex items-center gap-3 px-3 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-bold text-white">
                  {mark || <User size={18} strokeWidth={2} />}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[15.5px] font-bold leading-tight text-ink">
                    {fullName || 'Perfil'}
                  </div>
                  {email && (
                    <div className="truncate text-[12.5px] font-medium text-ink-2">{email}</div>
                  )}
                </div>
              </div>

              <div className="mx-1 h-px bg-surface-line" />

              <Link
                href="/tareas?scope=personal"
                role="menuitem"
                onClick={close}
                className="mt-1 flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left text-[14px] font-semibold text-ink no-underline hover:bg-surface-soft"
              >
                <CalendarPlus size={18} strokeWidth={2} className="shrink-0 text-v-2" />
                Mis tareas personales
              </Link>
              <Link
                href="/ajustes/cuenta"
                role="menuitem"
                onClick={close}
                className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left text-[14px] font-semibold text-ink no-underline hover:bg-surface-soft"
              >
                <User size={18} strokeWidth={2} className="shrink-0 text-ink" />
                Tu cuenta
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left text-[14px] font-semibold text-ink hover:bg-surface-soft"
                >
                  <LogOut size={18} strokeWidth={2} className="shrink-0 text-ink" />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[44px] flex-col items-center justify-center" data-no-pull>
      <button
        type="button"
        aria-label="Perfil"
        aria-expanded={open}
        onClick={() => shallowSet({ perfil: open ? null : '1' })}
        className={`flex min-h-[44px] w-full flex-col items-center justify-center gap-px ${
          open ? 'text-ink' : 'text-ink-3'
        }`}
      >
        <span className="grid h-7 w-7 place-items-center">
          <User size={28} strokeWidth={open ? 2.2 : 1.8} />
        </span>
        <span className={`text-[12px] ${open ? 'font-bold' : 'font-medium'}`}>Perfil</span>
      </button>
    </div>
  );
}
