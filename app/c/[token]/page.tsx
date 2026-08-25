export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import ConfirmButtons, { DoneCard } from '@/components/confirm/ConfirmButtons';
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
      <div className="relative overflow-hidden px-6 pb-8 pt-11">
        <div className="absolute -right-[70px] -top-[90px] h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#DDD3FF,#EEECFA_70%)]" />
        <div className="relative">
          <div className="mb-5 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-grad shadow-[0_10px_24px_rgba(139,92,246,.4)]">
            <Sparkles size={26} className="text-white" strokeWidth={2} />
          </div>
          <div className="text-[13px] font-semibold tracking-[.02em] text-v">Marlenne</div>
          <h1 className="mt-1 text-[28px] font-extrabold leading-[1.15] tracking-[-.02em]">
            Tu cita
          </h1>
        </div>
      </div>

      <div className="px-6 pb-10">
        {!peek.ok ? (
          <p className="text-[15px] font-semibold leading-snug text-ink-2">{linkCopy(peek.code)}</p>
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
