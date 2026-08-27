export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSession, listLoginTeam } from '@/lib/queries';
import { madridNow } from '@/lib/time';
import LoginForm from '@/components/LoginForm';
import PublicHero from '@/components/PublicHero';

export default async function LoginPage() {
  const [me, team] = await Promise.all([getSession(), listLoginTeam()]);
  if (me) redirect('/hoy');
  const h = madridNow().h;
  const hello = h < 13 ? 'Buenos días.' : h < 20 ? 'Buenas tardes.' : 'Buenas noches.';

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col bg-surface-bg pt-[env(safe-area-inset-top)]">
      <PublicHero kicker="Marlenne · Estética avanzada" title={<>{hello}<br />Entra con tu usuario</>}>
        <p className="mt-2.5 max-w-[320px] text-body font-medium leading-relaxed text-ink-2">
          Cada persona del equipo tiene su email y su contraseña. Nadie entra eligiendo un perfil.
        </p>
      </PublicHero>

      <LoginForm emails={team} />
    </div>
  );
}
