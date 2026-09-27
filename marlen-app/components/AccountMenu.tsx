'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, Check, ListTodo, LogOut, Settings, User, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { setWorkspace } from '@/app/actions/workspace';
import { isNextRedirect } from '@/lib/next-navigation-error';
import type { WorkspaceKind } from '@/lib/personal-tasks';

export default function AccountMenu({
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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = async (next: WorkspaceKind) => {
    if (busy || next === workspace) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await setWorkspace(next);
      if (result && !result.ok) setError(result.error);
      else setOpen(false);
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
        className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left transition motion-safe:active:scale-[.99] disabled:opacity-50 ${
          selected
            ? personal
              ? 'bg-[#E8F2FF] text-v-2'
              : 'bg-v-soft text-v'
            : 'text-ink'
        }`}
      >
        <Icon
          size={20}
          strokeWidth={2}
          className={`shrink-0 ${selected ? (personal ? 'text-v-2' : 'text-v') : 'text-ink'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{label}</span>
          <span
            className={`block truncate text-[13px] ${
              selected ? (personal ? 'text-v-2/75' : 'text-v/75') : 'text-ink-2'
            }`}
          >
            {hint}
          </span>
        </span>
        {selected && (
          <Check
            size={17}
            strokeWidth={2.8}
            className={`shrink-0 ${personal ? 'text-v-2' : 'text-v'}`}
          />
        )}
      </button>
    );
  };

  return (
    <div ref={root} className="relative flex min-h-[44px] flex-col items-center justify-center" data-no-pull>
      <button
        type="button"
        aria-label="Perfil"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className={`flex min-h-[44px] w-full flex-col items-center justify-center gap-px ${
          workspace === 'personal'
            ? 'text-v-2'
            : open
              ? 'text-ink'
              : 'text-ink-3'
        }`}
      >
        <span className="grid h-7 w-7 place-items-center">
          <User size={28} strokeWidth={open ? 2.2 : 1.8} />
        </span>
        <span className={`text-[12px] ${open ? 'font-bold' : 'font-medium'}`}>Perfil</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-40 mb-2 w-[min(calc(100vw-1.5rem),270px)] rounded-[22px] bg-white p-2 shadow-[0_20px_54px_rgba(15,14,26,.22)]">
          <div className="flex items-center gap-3 px-3 py-3">
            <User size={22} strokeWidth={2} className="shrink-0 text-ink-2" />
            <div className="min-w-0">
              <div className="truncate text-[16px] font-bold leading-tight">{fullName}</div>
              {email && <div className="truncate text-[13px] text-ink-2">{email}</div>}
            </div>
          </div>
          <div className="mx-1 h-px bg-surface-line" />
          <div className="py-1">
            {workspaceRow('company', 'Trabajo', companyName, Building2)}
            {hasPersonal
              ? workspaceRow('personal', 'Personal', 'Tareas, sin clientas', ListTodo)
              : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { void go('personal'); }}
                  className="flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left text-[15px] font-bold text-ink motion-safe:active:scale-[.99] disabled:opacity-50"
                >
                  <UserPlus size={20} strokeWidth={2} className="shrink-0 text-ink" />
                  Crear cuenta personal
                </button>
              )}
          </div>
          {error && <p className="px-3 pb-1 text-label font-semibold text-danger-fg">{error}</p>}
          <div className="mx-1 h-px bg-surface-line" />
          <div className="py-1">
            <Link
              href="/ajustes/cuenta"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-[15px] font-semibold text-ink no-underline motion-safe:active:scale-[.99]"
            >
              <Settings size={20} strokeWidth={2} className="shrink-0 text-ink" />
              Tu cuenta
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left text-[15px] font-semibold text-ink motion-safe:active:scale-[.99]"
              >
                <LogOut size={20} strokeWidth={2} className="shrink-0 text-ink" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
