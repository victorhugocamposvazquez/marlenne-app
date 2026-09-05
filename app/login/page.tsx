export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession, listLoginTeam } from '@/lib/queries';
import { madridNow } from '@/lib/time';
import LoginForm from '@/components/LoginForm';
import PublicHero from '@/components/PublicHero';
import { BRAND_NAME } from '@/lib/brand';

export default async function LoginPage() {
  const [me, team] = await Promise.all([getSession(), listLoginTeam()]);
  if (me) redirect('/hoy');
  const h = madridNow().h;
  const hello = h < 13 ? 'Buenos días.' : h < 20 ? 'Buenas tardes.' : 'Buenas noches.';
  const ua = headers().get('user-agent') ?? '';

  return (
    <div className="mx-auto flex h-full max-w-[440px] flex-col overflow-y-auto bg-surface-bg pt-[env(safe-area-inset-top)]">
      <PublicHero kicker={`${BRAND_NAME} · Estética avanzada`} title={<>{hello}<br />Entra en un toque</>}>
        <p className="mt-2.5 max-w-[320px] text-body font-medium leading-relaxed text-ink-2">
          En el móvil, huella o cara. Si hace falta, email y contraseña. Nadie entra eligiendo un perfil.
        </p>
      </PublicHero>

      <LoginForm emails={team} ua={ua} />
    </div>
  );
}
