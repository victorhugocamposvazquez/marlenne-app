'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Building2, Check, ListTodo, LogOut, Settings, User, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { setWorkspace } from '@/app/actions/workspace';
import { LocalSheet } from '@/components/Sheet';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import { isNextRedirect } from '@/lib/next-navigation-error';
import type { WorkspaceKind } from '@/lib/personal-tasks';

function close() {
  shallowSet({ perfil: null });
}

export default function ProfileSheetHost({
  fullName,
  email,
  companyName,
  workspace,
  hasPersonal,
}: {
  fullName: string;
  email: string;
  companyName: string;
  workspace: WorkspaceKind;
  hasPersonal: boolean;
}) {
  const perfil = useShallowParam('perfil');
  const open = perfil === '1';
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const go = async (next: WorkspaceKind) => {
    if (busy || next === workspace) {
      close();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await setWorkspace(next);
      // Éxito → redirect('/hoy') en el server action (lanza NEXT_REDIRECT).
      if (result && !result.ok) setError(result.error);
    } catch (err) {
      if (isNextRedirect(err)) throw err;
      setError('No se ha podido cambiar de cuenta.');
    } finally {
      setBusy(false);
    }
  };

  const workspaceRow = (kind: WorkspaceKind, label: string, hint: string, Icon: LucideIcon) => {
    const selected = workspace === kind;
    const personal = kind === 'personal';
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => { void go(kind); }}
        className={`flex w-full items-center gap-4 rounded-row px-5 py-4 text-left transition motion-safe:active:scale-[.99] disabled:opacity-50 ${
          selected
            ? personal
              ? 'bg-[#E8F2FF] text-v-2'
              : 'bg-v-soft text-v'
            : 'bg-surface-soft text-ink'
        }`}
      >
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-pill ${
            selected ? (personal ? 'bg-white/70' : 'bg-white/60') : 'bg-white'
          }`}
        >
          <Icon
            size={22}
            strokeWidth={2}
            className={selected ? (personal ? 'text-v-2' : 'text-v') : 'text-ink'}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body-lg font-bold">{label}</span>
          <span
            className={`mt-0.5 block truncate text-body ${
              selected ? (personal ? 'text-v-2/80' : 'text-v/80') : 'text-ink-2'
            }`}
          >
            {hint}
          </span>
        </span>
        {selected && (
          <Check
            size={20}
            strokeWidth={2.8}
            className={`shrink-0 ${personal ? 'text-v-2' : 'text-v'}`}
          />
        )}
      </button>
    );
  };

  const actionRow = (children: ReactNode, className = '') => (
    <div className={`flex min-h-[56px] w-full items-center gap-4 rounded-row bg-surface-soft px-5 py-3.5 text-body-lg font-semibold text-ink ${className}`}>
      {children}
    </div>
  );

  return (
    <LocalSheet
      open
      onClose={close}
      title="Perfil"
      subtitle={email || fullName}
      initialHeight="tall"
      floorDetent="mid"
    >
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex items-center gap-4 rounded-row bg-surface-soft px-5 py-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-pill bg-white text-ink-2">
            <User size={28} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-h1 font-extrabold leading-tight tracking-[-.02em]">{fullName}</div>
            {email && <div className="truncate text-body font-medium text-ink-2">{email}</div>}
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-caption font-bold uppercase tracking-[.03em] text-ink-2">Modo</p>
          <div className="flex flex-col gap-2.5">
            {workspaceRow('company', 'Trabajo', companyName, Building2)}
            {hasPersonal
              ? workspaceRow('personal', 'Personal', 'Tareas, sin clientas', ListTodo)
              : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { void go('personal'); }}
                  className="flex w-full items-center gap-4 rounded-row bg-surface-soft px-5 py-4 text-left motion-safe:active:scale-[.99] disabled:opacity-50"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-white">
                    <UserPlus size={22} strokeWidth={2} className="text-ink" />
                  </span>
                  <span className="text-body-lg font-bold text-ink">Crear cuenta personal</span>
                </button>
              )}
          </div>
        </div>

        {error && <p className="text-body font-semibold text-danger-fg">{error}</p>}

        <div>
          <p className="mb-2.5 text-caption font-bold uppercase tracking-[.03em] text-ink-2">Cuenta</p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/ajustes/cuenta"
              onClick={close}
              className="no-underline"
            >
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
