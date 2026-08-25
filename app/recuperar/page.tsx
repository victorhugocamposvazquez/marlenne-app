'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { changePassword } from '@/app/actions/auth';
import { inputCls } from '@/components/Sheet';

export default function RecuperarPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    const { data } = sb.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    void sb.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const save = () => {
    setError(null);
    const fd = new FormData();
    fd.set('password', password);
    fd.set('confirm', confirm);
    startTransition(async () => {
      const r = await changePassword(fd);
      if (!r.ok) setError(r.error ?? 'No se ha podido guardar');
      else router.replace('/hoy');
    });
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col bg-surface-bg px-6 pt-[max(4rem,calc(env(safe-area-inset-top)+1.5rem))]">
      <h1 className="text-[26px] font-extrabold tracking-[-.025em]">Nueva contraseña</h1>
      <p className="mt-2 text-[14px] font-medium text-ink-2">
        {ready
          ? 'Elige una contraseña de al menos 8 caracteres.'
          : 'Abre el enlace del email para poder cambiarla.'}
      </p>
      {ready && (
        <div className="mt-6 flex flex-col gap-3">
          <input
            className={inputCls}
            type="password"
            autoComplete="new-password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <input
            className={inputCls}
            type="password"
            autoComplete="new-password"
            placeholder="Repetir"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
          {error && <p className="text-[12px] font-semibold text-pink-700">{error}</p>}
          <button
            onClick={save}
            disabled={pending || password.length < 8}
            className="rounded-field bg-grad py-3.5 text-[15px] font-extrabold text-white shadow-btn disabled:opacity-40"
          >
            {pending ? 'Guardando…' : 'Guardar y entrar'}
          </button>
        </div>
      )}
    </div>
  );
}
