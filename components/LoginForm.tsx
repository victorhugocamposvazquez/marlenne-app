'use client';

import { useState, useTransition } from 'react';
import { signIn } from '@/app/actions/auth';
import AuthLinks from '@/components/AuthLinks';
import PasskeyLoginButton from '@/components/PasskeyLoginButton';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';

export default function LoginForm({ ua }: { ua: string }) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const fd = new FormData();
    fd.set('email', email);
    fd.set('password', password);
    startTransition(async () => {
      const r = await signIn(fd);
      if (r && !r.ok) setError(r.error ?? 'No se ha podido entrar');
    });
  };

  return (
    <div className="flex flex-col gap-3 px-6 pb-8">
      <PasskeyLoginButton ua={ua} onError={setError} />
      <label>
        <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Email</span>
        <input
          className={inputCls}
          type="email"
          autoComplete="username webauthn"
          inputMode="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
        />
      </label>
      <label>
        <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Contraseña</span>
        <input
          className={inputCls}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        />
      </label>

      {error && (
        <p className="rounded-chip bg-danger-bg px-3 py-2 text-label font-semibold text-danger-fg">{error}</p>
      )}

      <Button
        size="lg"
        full
        className="mt-1"
        onClick={submit}
        disabled={pending || !email || !password}
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
      <AuthLinks current="login" email={email} />
    </div>
  );
}
