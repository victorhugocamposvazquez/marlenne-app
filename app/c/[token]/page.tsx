export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import ConfirmButtons, { DoneCard } from '@/components/confirm/ConfirmButtons';
import PublicHero from '@/components/PublicHero';
import { linkCopy, peekAppointmentLink } from '@/lib/confirm-link';
import { createClient } from '@/lib/supabase/server';

const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

export const metadata: Metadata = {
  title: 'Confirmar cita',
  robots: { index: false, follow: false },
};

export default async function ConfirmPage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const peek = TOKEN.test(token)
    ? await peekAppointmentLink(createClient(), token)
    : { ok: false as const, code: 'not_found' };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col bg-surface-bg pt-[env(safe-area-inset-top)]">
      <PublicHero kicker="Marlenne" title="Tu cita" />

      <div className="px-6 pb-10">
        {!peek.ok ? (
          <p className="text-body-lg font-semibold leading-snug text-ink-2">{linkCopy(peek.code)}</p>
        ) : peek.responded ? (
          <DoneCard peek={peek} />
        ) : (
          <ConfirmButtons
            token={token}
            firstName={peek.first_name ?? 'Hola'}
            service={peek.service ?? 'tu cita'}
            startsAt={peek.starts_at ?? ''}
          />
        )}
      </div>
    </div>
  );
}
