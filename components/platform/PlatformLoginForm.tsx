'use client';

import { useState, useTransition } from 'react';
import { signInForPlatform } from '@/app/actions/platform';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';

export default function PlatformLoginForm() {
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
      const r = await signInForPlatform(fd);
      if (r && !r.ok) setError(r.error ?? 'No se ha podido entrar');
    });
  };

  return (
    <div className="mx-auto mt-8 w-full max-w-md rounded-card bg-surface-soft p-6">
      <label>
        <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Email</span>
        <input
          className={inputCls}
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@marlen.es"
        />
      </label>
      <label className="mt-3 block">
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
        <p className="mt-3 rounded-chip bg-danger-bg px-3 py-2 text-label font-semibold text-danger-fg">{error}</p>
      )}

      <Button
        size="lg"
        full
        className="mt-4"
        onClick={submit}
        disabled={pending || !email || !password}
      >
        {pending ? 'Entrando…' : 'Entrar a consola'}
      </Button>
    </div>
  );
}
