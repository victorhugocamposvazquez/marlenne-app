'use client';

import { useState, useTransition } from 'react';
import { linkCopy, respondAppointmentLink, type LinkPeek } from '@/lib/confirm-link';
import { createClient } from '@/lib/supabase/client';
import { shortWhen } from '@/lib/time';

export default function ConfirmButtons({
  token, firstName, service, startsAt,
}: {
  token: string;
  firstName: string;
  service: string;
  startsAt: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<LinkPeek | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const act = (action: 'yes' | 'no') => {
    setErr(null);
    startTransition(async () => {
      const r = await respondAppointmentLink(createClient(), token, action);
      if (!r.ok) setErr(linkCopy(r.code));
      else setDone(r);
    });
  };

  if (done?.responded) {
    return <DoneCard peek={done} />;
  }

  return (
    <>
      <p className="text-[15px] font-semibold leading-snug text-ink-2">
        Hola {firstName}. Tu cita de <span className="font-extrabold text-ink">{service}</span>
        {' '}es {shortWhen(startsAt)}.
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => act('yes')}
          className="w-full rounded-field bg-grad py-3.5 text-[15px] font-extrabold text-white shadow-btn disabled:opacity-40"
        >
          Sí, voy
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => act('no')}
          className="w-full rounded-field border border-surface-line bg-white py-3.5 text-[15px] font-bold text-ink-2 disabled:opacity-40"
        >
          No puedo
        </button>
      </div>
      {err && <p className="mt-3 text-[13px] font-semibold text-pink-700">{err}</p>}
    </>
  );
}

export function DoneCard({ peek }: { peek: LinkPeek }) {
  if (peek.response === 'yes') {
    return (
      <p className="text-[15px] font-semibold leading-snug text-ink-2">
        Perfecto, {peek.first_name}. Te esperamos {peek.starts_at ? shortWhen(peek.starts_at) : ''}.
      </p>
    );
  }
  return (
    <p className="text-[15px] font-semibold leading-snug text-ink-2">
      Hueco liberado. Si quieres otra fecha, llama al centro.
    </p>
  );
}
