'use client';

import { useState, useTransition } from 'react';
import { changePassword } from '@/app/actions/auth';
import { inputCls } from '@/components/Sheet';
import { useToast } from '@/components/Toast';

export default function PasswordForm() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    const fd = new FormData();
    fd.set('password', password);
    fd.set('confirm', confirm);
    startTransition(async () => {
      const r = await changePassword(fd);
      if (!r.ok) setError(r.error ?? 'No se ha podido cambiar');
      else {
        setPassword('');
        setConfirm('');
        toast('Contraseña actualizada');
      }
    });
  };

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-3">Tu contraseña</h2>
      <div className="rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
        <input
          className={`${inputCls} mb-2`}
          type="password"
          autoComplete="new-password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <input
          className={`${inputCls} mb-2`}
          type="password"
          autoComplete="new-password"
          placeholder="Repetir"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
        />
        {error && <p className="mb-2 text-label font-semibold text-danger-fg">{error}</p>}
        <button
          onClick={save}
          disabled={pending || password.length < 8}
          className="w-full rounded-field bg-grad py-3 text-body font-extrabold text-white shadow-btn disabled:opacity-40"
        >
          {pending ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </section>
  );
}
