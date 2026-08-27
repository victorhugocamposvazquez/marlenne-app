'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { changePassword } from '@/app/actions/auth';
import { inputCls } from '@/components/Sheet';
import PublicHero from '@/components/PublicHero';
import Button from '@/components/ui/Button';

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
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col bg-surface-bg pt-[env(safe-area-inset-top)]">
      <PublicHero kicker="Marlenne" title="Nueva contraseña">
        <p className="mt-2.5 max-w-[320px] text-body font-medium leading-relaxed text-ink-2">
          {ready
            ? 'Elige una contraseña de al menos 8 caracteres.'
            : 'Abre el enlace del email para poder cambiarla.'}
        </p>
      </PublicHero>
      {ready && (
        <div className="flex flex-col gap-3 px-6 pb-10">
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
          {error && <p className="text-label font-semibold text-danger-fg">{error}</p>}
          <Button
            size="lg"
            full
            onClick={save}
            disabled={pending || password.length < 8}
          >
            {pending ? 'Guardando…' : 'Guardar y entrar'}
          </Button>
        </div>
      )}
    </div>
  );
}
