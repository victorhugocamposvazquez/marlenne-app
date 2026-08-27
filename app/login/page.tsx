export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSession, listLoginTeam } from '@/lib/queries';
import { madridNow } from '@/lib/time';
import { Sparkles } from 'lucide-react';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage() {
  const [me, team] = await Promise.all([getSession(), listLoginTeam()]);
  if (me) redirect('/hoy');
  const h = madridNow().h;
  const hello = h < 13 ? 'Buenos días.' : h < 20 ? 'Buenas tardes.' : 'Buenas noches.';

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col bg-surface-bg pt-[env(safe-area-inset-top)]">
      <div className="relative overflow-hidden px-6 pb-[30px] pt-11">
        <div className="absolute -right-[70px] -top-[90px] h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgb(var(--c-blob)),rgb(var(--c-bg))_70%)]" />
        <div className="relative">
          <div className="mb-5 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-grad shadow-btn">
            <Sparkles size={26} className="text-white" strokeWidth={2} />
          </div>
          <div className="text-body font-semibold tracking-[.02em] text-v">Marlenne · Estética avanzada</div>
          <h1 className="mt-1 text-display font-extrabold leading-[1.15] tracking-[-.02em]">
            {hello}<br />Entra con tu usuario
          </h1>
          <p className="mt-2.5 max-w-[320px] text-sm font-medium leading-relaxed text-ink-2">
            Cada persona del equipo tiene su email y su contraseña. Nadie entra eligiendo un perfil.
          </p>
        </div>
      </div>

      <LoginForm emails={team} />
    </div>
  );
}
