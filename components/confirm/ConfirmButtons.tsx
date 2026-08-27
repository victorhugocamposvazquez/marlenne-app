'use client';

import { useState, useTransition } from 'react';
import { linkCopy, respondAppointmentLink, type LinkPeek } from '@/lib/confirm-link';
import { createClient } from '@/lib/supabase/client';
import { shortWhen } from '@/lib/time';
import Button from '@/components/ui/Button';

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
      <p className="text-body-lg font-semibold leading-snug text-ink-2">
        Hola {firstName}. Tu cita de <span className="font-extrabold text-ink">{service}</span>
        {' '}es {shortWhen(startsAt)}.
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        <Button size="lg" full disabled={pending} onClick={() => act('yes')}>
          Sí, voy
        </Button>
        <Button size="lg" full variant="secondary" disabled={pending} onClick={() => act('no')}>
          No puedo
        </Button>
      </div>
      {err && <p className="mt-3 text-body font-semibold text-danger-fg">{err}</p>}
    </>
  );
}

export function DoneCard({ peek }: { peek: LinkPeek }) {
  if (peek.response === 'yes') {
    return (
      <p className="text-body-lg font-semibold leading-snug text-ink-2">
        Perfecto, {peek.first_name}. Te esperamos {peek.starts_at ? shortWhen(peek.starts_at) : ''}.
      </p>
    );
  }
  return (
    <p className="text-body-lg font-semibold leading-snug text-ink-2">
      Hueco liberado. Si quieres otra fecha, llama al centro.
    </p>
  );
}
