'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = email.includes('@') && pass.length >= 4;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      if (!res.ok) {
        setError('Correo o contraseña incorrectos');
        return;
      }
      const from = searchParams.get('from') || '/';
      router.replace(from.startsWith('/login') ? '/' : from);
      router.refresh();
    } catch {
      setError('No se pudo conectar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="w-full max-w-[360px] space-y-5" onSubmit={submit}>
      <div className="flex items-center gap-3">
        <BrandLogo size={48} variant="black" />
        <div className="space-y-0.5">
          <h2 className="text-[28px] font-bold tracking-tight">Entrar</h2>
          <p className="text-[15px] text-ink-2">Con tu cuenta del equipo.</p>
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-[13px] font-semibold text-ink-2">Correo</span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@marlen.app"
          className="h-[54px] w-full rounded-field border-none bg-page px-4 text-[16px] outline-none ring-brand-pink focus:ring-2"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-[13px] font-semibold text-ink-2">Contraseña</span>
        <input
          type="password"
          autoComplete="current-password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          placeholder="••••••••"
          className="h-[54px] w-full rounded-field border-none bg-page px-4 text-[16px] outline-none ring-brand-pink focus:ring-2"
        />
      </label>

      {error && (
        <p className="rounded-field bg-[#FFF1F4] px-3 py-2 text-[13px] font-semibold text-[#B3123B]">{error}</p>
      )}

      <button
        type="submit"
        disabled={!ready || loading}
        className={`h-14 w-full rounded-pill text-[16px] font-bold transition-colors ${ready && !loading ? 'bg-grad text-white shadow-brand' : 'bg-page text-ink-3'}`}
      >
        {loading ? 'Entrando…' : ready ? 'Entrar' : 'Escribe correo y contraseña'}
      </button>
      <p className="text-center text-[13px] text-ink-2">Después pediremos un código en tu móvil.</p>
      <p className="rounded-field bg-page p-3 text-center text-[12px] leading-relaxed text-ink-2">
        Demo: cualquier correo válido y contraseña de 4+ caracteres · sin base de datos
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-wrap">
      <div className="flex min-h-[320px] flex-1 flex-col justify-between gap-10 bg-grad-br p-10 text-white">
        <BrandLogo size={52} light />
        <div className="max-w-md space-y-3">
          <h1 className="text-[36px] font-bold leading-tight tracking-tight">Panel de gestión</h1>
          <p className="text-[16px] leading-relaxed opacity-90">Empresas, planes, SMS, cobros y estado de los servicios.</p>
        </div>
        <p className="text-[13px] opacity-75">marlén · solo equipo</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white p-6 sm:p-10">
        <Suspense fallback={<div className="text-[14px] text-ink-2">Cargando…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
