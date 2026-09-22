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
      <div className="flex items-center gap-2.5">
        <BrandLogo size={44} variant="black" className="shrink-0" />
        <div className="leading-none">
          <h2 className="text-[26px] font-bold tracking-[-0.03em]">Entrar</h2>
          <p className="mt-1 text-[14px] leading-snug text-ink-2">Con tu cuenta del equipo.</p>
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
    <div className="flex min-h-[100dvh] flex-col xl:flex-row">
      {/* Móvil/tablet: franja arriba. Solo desktop ancho: columna lateral */}
      <div className="relative flex shrink-0 flex-col justify-end overflow-hidden bg-grad-br px-6 pb-5 pt-7 text-white xl:min-h-[100dvh] xl:w-[min(44%,520px)] xl:shrink-0 xl:justify-between xl:gap-10 xl:p-10">
        <BrandWatermark className="absolute right-[-12%] top-[42%] h-[180px] w-[180px] -translate-y-1/2 sm:h-[210px] sm:w-[210px] xl:left-1/2 xl:right-auto xl:top-1/2 xl:h-[min(70vh,560px)] xl:w-[min(70vh,560px)] xl:-translate-x-1/2 xl:-translate-y-[42%]" />
        <div className="relative z-[1] hidden xl:block">
          <BrandLogo size={52} light />
        </div>
        <div className="relative z-[1] max-w-md space-y-1.5 xl:space-y-3">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight xl:text-[36px]">Panel de gestión</h1>
          <p className="text-[14px] leading-snug opacity-90 xl:text-[16px] xl:leading-relaxed">
            Empresas, planes, SMS, cobros y estado de los servicios.
          </p>
        </div>
        <p className="relative z-[1] mt-4 text-[12px] opacity-75 xl:mt-0 xl:text-[13px]">marlén · solo equipo</p>
      </div>
      <div className="flex flex-1 items-start justify-center bg-white px-6 pb-10 pt-8 sm:items-center sm:p-10 xl:items-center">
        <Suspense fallback={<div className="text-[14px] text-ink-2">Cargando…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
