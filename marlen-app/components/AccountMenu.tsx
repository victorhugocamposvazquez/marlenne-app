'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, LogOut, User } from 'lucide-react';
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
    } catch (err) {
      if (isNextRedirect(err)) throw err;
      setError('No se ha podido cambiar de cuenta.');
    } finally {
      setBusy(false);
    }
  };

  const row = (kind: WorkspaceKind, label: string, hint: string) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => { void go(kind); }}
      className="flex w-full items-center gap-2 rounded-field px-2 py-2 text-left motion-safe:active:scale-[.99] disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body font-bold">{label}</span>
        <span className="block truncate text-label text-ink-2">{hint}</span>
      </span>
      {workspace === kind && <Check size={16} strokeWidth={2.4} className="shrink-0 text-ink" />}
    </button>
  );

  return (
    <div ref={root} className="relative flex min-h-[44px] flex-col items-center justify-center" data-no-pull>
      <button
        type="button"
        aria-label="Perfil"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className={`flex min-h-[44px] w-full flex-col items-center justify-center gap-px ${open ? 'text-ink' : 'text-ink-3'}`}
      >
        <span className="grid h-7 w-7 place-items-center">
          <User size={28} strokeWidth={open ? 2.2 : 1.8} />
        </span>
        <span className={`text-[12px] ${open ? 'font-bold' : 'font-medium'}`}>Perfil</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-40 mb-2 w-[min(calc(100vw-1.5rem),280px)] rounded-card border border-surface-line bg-white p-3 shadow-popup">
          <div className="px-2 pb-2">
            <div className="truncate text-body font-extrabold">{fullName}</div>
            {email && <div className="truncate text-label text-ink-2">{email}</div>}
            <div className="mt-1 text-caption font-bold uppercase tracking-[.03em] text-ink-3">
              {workspace === 'personal' ? 'Personal' : companyName}
            </div>
          </div>
          <div className="border-t border-surface-line pt-1">
            {row('company', 'Empresa', companyName)}
            {hasPersonal
              ? row('personal', 'Personal', 'Tareas, sin clientas')
              : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { void go('personal'); }}
                  className="flex w-full rounded-field px-2 py-2 text-left text-body font-bold motion-safe:active:scale-[.99] disabled:opacity-50"
                >
                  Crear cuenta personal
                </button>
              )}
          </div>
          {error && <p className="px-2 pt-1 text-label font-semibold text-danger-fg">{error}</p>}
          <div className="mt-1 border-t border-surface-line pt-1">
            <Link
              href="/ajustes/cuenta"
              onClick={() => setOpen(false)}
              className="block rounded-field px-2 py-2 text-body font-bold text-ink no-underline"
            >
              Tu cuenta
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-field px-2 py-2 text-body font-bold text-ink"
              >
                <LogOut size={16} strokeWidth={2.2} />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
