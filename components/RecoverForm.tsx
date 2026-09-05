'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword, requestPasswordReset } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';
import AuthLinks from '@/components/AuthLinks';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';

export default function RecoverForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

  const sendLink = () => {
    setError(null);
    setInfo(null);
    const fd = new FormData();
    fd.set('email', email);
    startTransition(async () => {
      const r = await requestPasswordReset(fd);
      if (!r.ok) setError(r.error ?? 'No se ha podido enviar');
      else setInfo('Si el email existe, te hemos mandado un enlace para cambiar la contraseña.');
    });
  };

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

  if (ready) {
    return (
      <div className="flex flex-col gap-3 px-5 pb-8">
        <label>
          <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Nueva contraseña</span>
          <input
            className={inputCls}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Repetir</span>
          <input
            className={inputCls}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); }}
          />
        </label>
        {error && (
          <p className="rounded-chip bg-danger-bg px-3 py-2 text-label font-semibold text-danger-fg">{error}</p>
        )}
        <Button size="lg" full onClick={save} disabled={pending || password.length < 8}>
          {pending ? 'Guardando…' : 'Guardar y entrar'}
        </Button>
        <AuthLinks current="recuperar" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-5 pb-8">
      <label>
        <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Email</span>
        <input
          className={inputCls}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendLink(); }}
          placeholder="tu@email.com"
        />
      </label>
      {error && (
        <p className="rounded-chip bg-danger-bg px-3 py-2 text-label font-semibold text-danger-fg">{error}</p>
      )}
      {info && (
        <p className="rounded-chip bg-ok-bg px-3 py-2 text-label font-semibold text-ok-strong">{info}</p>
      )}
      <Button size="lg" full onClick={sendLink} disabled={pending || !email}>
        {pending ? 'Enviando…' : 'Enviar enlace'}
      </Button>
      <AuthLinks current="recuperar" email={email} />
    </div>
  );
}
