'use client';

import { useState, useTransition } from 'react';
import { signUp } from '@/app/actions/auth';
import AuthLinks from '@/components/AuthLinks';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';

export default function RegisterForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    setInfo(null);
    const fd = new FormData();
    fd.set('name', name);
    fd.set('email', email);
    fd.set('password', password);
    fd.set('confirm', confirm);
    startTransition(async () => {
      const r = await signUp(fd);
      if (r && !r.ok) setError(r.error ?? 'No se ha podido crear la cuenta');
      else if (r?.confirm) setInfo('Te hemos mandado un email. Ábrelo y ya puedes entrar.');
    });
  };

  return (
    <div className="flex flex-col gap-3 px-5 pb-8">
      <label>
        <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Nombre</span>
        <input
          className={inputCls}
          type="text"
          autoComplete="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tu nombre"
        />
      </label>
      <label>
        <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Email</span>
        <input
          className={inputCls}
          type="email"
          autoComplete="email"
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
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Repetir contraseña</span>
        <input
          className={inputCls}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
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
        disabled={pending || !name || !email || password.length < 8}
      >
        {pending ? 'Creando…' : 'Crear cuenta'}
      </Button>
      <AuthLinks current="registro" email={email} />
    </div>
  );
}
