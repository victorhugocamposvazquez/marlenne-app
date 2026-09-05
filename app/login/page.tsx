export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/queries';
import { madridNow } from '@/lib/time';
import LoginForm from '@/components/LoginForm';
import PublicHero from '@/components/PublicHero';
import PublicShell from '@/components/PublicShell';
import { BRAND_NAME } from '@/lib/brand';
import { platformLoginHint, platformLoginTitle } from '@/lib/webauthn';

export default async function LoginPage() {
  const me = await getSession();
  if (me) redirect('/hoy');
  const h = madridNow().h;
  const hello = h < 13 ? 'Buenos días.' : h < 20 ? 'Buenas tardes.' : 'Buenas noches.';
  const ua = headers().get('user-agent') ?? '';

  return (
    <PublicShell>
      <PublicHero kicker={`${BRAND_NAME} · Estética avanzada`} title={<>{hello}<br />{platformLoginTitle(ua)}</>}>
        <p className="mt-2.5 max-w-[320px] text-body font-medium leading-relaxed text-ink-2">
          {platformLoginHint(ua)}
        </p>
      </PublicHero>
      <LoginForm ua={ua} />
    </PublicShell>
  );
}
