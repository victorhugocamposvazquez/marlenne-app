'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import BrandLogo, { BrandWatermark } from '@/components/BrandLogo';

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
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <div className="relative flex h-[148px] shrink-0 flex-col justify-end overflow-hidden bg-grad-br px-6 pb-5 pt-6 text-white sm:h-[168px] lg:min-h-[320px] lg:h-auto lg:flex-1 lg:justify-between lg:gap-10 lg:p-10">
        <BrandWatermark className="absolute right-[-8%] top-1/2 h-[200px] w-[200px] -translate-y-[46%] sm:h-[220px] sm:w-[220px] lg:left-1/2 lg:right-auto lg:top-1/2 lg:h-[min(115%,720px)] lg:w-[min(115%,720px)] lg:-translate-x-1/2 lg:-translate-y-[42%]" />
        <div className="relative z-[1] hidden lg:block">
          <BrandLogo size={52} light />
        </div>
        <div className="relative z-[1] max-w-md space-y-1 lg:space-y-3">
          <h1 className="text-[24px] font-bold leading-tight tracking-tight sm:text-[26px] lg:text-[36px]">Panel de gestión</h1>
          <p className="hidden text-[14px] leading-snug opacity-90 sm:block lg:text-[16px] lg:leading-relaxed">
            Empresas, planes, SMS, cobros y estado de los servicios.
          </p>
        </div>
        <p className="relative z-[1] hidden text-[13px] opacity-75 lg:block">marlén · solo equipo</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white p-6 sm:p-10">
        <Suspense fallback={<div className="text-[14px] text-ink-2">Cargando…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
