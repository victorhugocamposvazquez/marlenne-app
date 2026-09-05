export const dynamic = 'force-dynamic';

import PublicHero from '@/components/PublicHero';
import PublicShell from '@/components/PublicShell';
import RecoverForm from '@/components/RecoverForm';
import { BRAND_NAME } from '@/lib/brand';

export default function RecuperarPage({
  searchParams,
}: {
  searchParams?: { email?: string };
}) {
  return (
    <PublicShell>
      <PublicHero kicker={BRAND_NAME} title="Recuperar contraseña">
        <p className="mt-2.5 max-w-[320px] text-body font-medium leading-relaxed text-ink-2">
          Te mandamos un enlace al email. Si ya lo abriste, elige la contraseña nueva.
        </p>
      </PublicHero>
      <RecoverForm initialEmail={searchParams?.email ?? ''} />
    </PublicShell>
  );
}
