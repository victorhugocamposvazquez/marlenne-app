'use client';

import { useState, useTransition } from 'react';
import { requestPasswordReset, signIn } from '@/app/actions/auth';
import PasskeyLoginButton from '@/components/PasskeyLoginButton';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';

export default function LoginForm({
  emails,
  ua,
}: {
  emails: { name: string; email: string }[];
  ua: string;
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    <div className="flex flex-col gap-3 px-5 pb-8">
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
          placeholder="tu@marlenne.es"
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
      {info && (
        <p className="rounded-chip bg-ok-bg px-3 py-2 text-label font-semibold text-ok-strong">{info}</p>
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
      <Button
        type="button"
        variant="ghost"
        disabled={pending || !email}
        onClick={() => {
          setError(null);
          setInfo(null);
          const fd = new FormData();
          fd.set('email', email);
          startTransition(async () => {
            const r = await requestPasswordReset(fd);
            if (!r.ok) setError(r.error ?? 'No se ha podido enviar');
            else setInfo('Si el email existe, te hemos mandado un enlace para cambiar la contraseña.');
          });
        }}
      >
        Olvidé la contraseña
      </Button>

      {emails.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-caption font-bold uppercase tracking-[.03em] text-ink-2">Rellenar email del equipo</p>
          <div className="flex flex-wrap gap-2">
            {emails.map(p => (
              <button
                key={p.email}
                type="button"
                onClick={() => setEmail(p.email)}
                className="min-h-[44px] rounded-chip border border-surface-line bg-surface-card px-3 py-1.5 text-label font-bold text-ink-2 motion-safe:active:scale-[.97]"
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
