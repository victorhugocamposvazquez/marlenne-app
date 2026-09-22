export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/queries';
import PublicHero from '@/components/PublicHero';
import PublicShell from '@/components/PublicShell';
import RegisterForm from '@/components/RegisterForm';
import { BRAND_NAME } from '@/lib/brand';

export default async function RegistroPage() {
  const me = await getSession();
  if (me) redirect('/hoy');

  return (
    <PublicShell>
      <PublicHero kicker={BRAND_NAME} title="Crea tu cuenta">
        <p className="mt-2.5 max-w-[320px] text-body font-medium leading-relaxed text-ink-2">
          Email y contraseña. Dirección te pone el rol después, si hace falta.
        </p>
      </PublicHero>
      <RegisterForm />
    </PublicShell>
  );
}
