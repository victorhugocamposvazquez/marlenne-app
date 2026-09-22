'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const ready = email.includes('@') && pass.length >= 4;

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
        <form
          className="w-full max-w-[360px] space-y-5"
          onSubmit={e => {
            e.preventDefault();
            if (!ready) return;
            router.push('/');
          }}
        >
          <div className="space-y-1.5">
            <h2 className="text-[28px] font-bold tracking-tight">Entrar</h2>
            <p className="text-[15px] text-ink-2">Con tu cuenta del equipo.</p>
          </div>
          <label className="block space-y-2">
            <span className="text-[13px] font-semibold text-ink-2">Correo</span>
            <input
              type="email"
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
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              className="h-[54px] w-full rounded-field border-none bg-page px-4 text-[16px] outline-none ring-brand-pink focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={!ready}
            className={`h-14 w-full rounded-pill text-[16px] font-bold ${ready ? 'bg-ink text-white' : 'bg-page text-ink-3'}`}
          >
            {ready ? 'Entrar' : 'Escribe correo y contraseña'}
          </button>
          <p className="text-center text-[13px] text-ink-2">Después pediremos un código en tu móvil.</p>
          <p className="rounded-field bg-page p-3 text-center text-[12px] text-ink-2">Modo demo: cualquier correo válido entra · sin base de datos</p>
        </form>
      </div>
    </div>
  );
}
