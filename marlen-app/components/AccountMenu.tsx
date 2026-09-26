'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, LogOut } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { setWorkspace } from '@/app/actions/workspace';
import { isNextRedirect } from '@/lib/next-navigation-error';
import type { WorkspaceKind } from '@/lib/personal-tasks';

const SWITCH_MS = 280;

export default function AccountMenu({
  initials,
  color,
  fullName,
  email,
  companyName,
  workspace,
  hasPersonal,
  compact = false,
}: {
  initials: string;
  color: string | null;
  fullName: string;
  email: string;
  companyName: string;
  workspace: WorkspaceKind;
  hasPersonal: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wait = useRef<number | null>(null);
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

  useEffect(() => () => {
    if (wait.current) window.clearTimeout(wait.current);
  }, []);

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

  const onPointerUp = () => {
    if (wait.current) {
      window.clearTimeout(wait.current);
      wait.current = null;
      if (hasPersonal) void go(workspace === 'personal' ? 'company' : 'personal');
      else setOpen(true);
      return;
    }
    wait.current = window.setTimeout(() => {
      wait.current = null;
      setOpen(true);
    }, SWITCH_MS);
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
    <div ref={root} className={`relative flex flex-col items-center ${compact ? 'w-11' : 'min-w-0 flex-1'}`} data-no-pull>
      <button
        type="button"
        aria-label="Tu cuenta"
        aria-expanded={open}
        onPointerUp={onPointerUp}
        className={`grid place-items-center rounded-full font-extrabold text-white motion-safe:active:scale-[.96] ${compact ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-[12px]'}`}
        style={{ background: color || '#8B5CF6' }}
      >
        {initials.slice(0, 2)}
      </button>
      <span className={`font-bold ${compact ? 'text-[10px] leading-none' : 'text-[12px]'}`} style={{ color: 'rgb(var(--c-ink-3))' }}>Tú</span>
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
