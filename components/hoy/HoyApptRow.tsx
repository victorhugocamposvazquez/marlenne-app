'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, UserRound } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { durLbl, fmt, minutesOfDay } from '@/lib/time';
import { updateStatus } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { waConfirmMsg, waHref } from '@/lib/phone';
import type { AgendaAppt } from '@/lib/types';

export default function HoyApptRow({
  appt, late = false, cabin = false,
}: {
  appt: AgendaAppt;
  late?: boolean;
  cabin?: boolean;
}) {
  const cat = CATEGORIES[appt.category];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const wa = waHref(
    appt.client_phone,
    waConfirmMsg({
      clientLabel: appt.client_label,
      service: appt.service_name,
      startsAt: appt.starts_at,
    }),
  );

  const set = (status: string) => {
    startTransition(async () => {
      const r = await updateStatus(createClient(), appt.id, status);
      if (r.ok) router.refresh();
    });
  };

  const actions = (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => set('curso')}
        className="min-h-[44px] shrink-0 rounded-icon bg-v px-3 text-label font-bold text-white transition active:scale-[.97] disabled:opacity-40"
      >
        Pasa
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => set('noshow')}
        className="min-h-[44px] shrink-0 rounded-icon border border-danger-line bg-surface-card px-2.5 text-label font-bold text-danger-fg transition active:scale-[.97] disabled:opacity-40"
      >
        No vino
      </button>
      {late && appt.client_phone && (
        <a
          href={`tel:${appt.client_phone}`}
          aria-label={`Llamar a ${appt.client_label}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-icon border border-surface-line bg-surface-card text-v-d transition active:scale-[.96]"
        >
          <Phone size={16} strokeWidth={2.2} />
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp a ${appt.client_label}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-icon bg-ok-bg text-micro font-extrabold text-ok-fg transition active:scale-[.96]"
        >
          WA
        </a>
      )}
    </>
  );

  return (
    <div className={`rounded-row border p-3 shadow-card ${
      late ? 'border-danger-line bg-danger-bg' : 'border-surface-line bg-surface-card'
    }`}
    >
      <div className="flex items-center gap-2">
        <Link href={`/agenda?appt=${appt.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="w-[52px] shrink-0 rounded-icon bg-v-tint py-[7px] text-center">
            <div className="text-body font-extrabold leading-none text-v-d tabular-nums">
              {fmt(minutesOfDay(appt.starts_at))}
            </div>
            <div className="mt-0.5 text-micro font-semibold text-ink-3">{durLbl(appt.duration_min)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-body font-bold tracking-[-.01em]">{appt.client_label}</div>
            <div className="truncate text-caption font-medium text-ink-3">
              {appt.service_name}
              {cabin ? '' : ` · ${appt.provider_name}`}
              {late ? ' · retraso' : ''}
            </div>
          </div>
          {!cabin && (
            <span className="shrink-0 rounded-badge px-2 py-1 text-micro font-bold" style={{ background: cat.bg, color: cat.fg }}>
              {cat.label}
            </span>
          )}
        </Link>
        {cabin && appt.client_id && (
          <Link
            href={`/clientas/${appt.client_id}`}
            aria-label={`Ficha de ${appt.client_label}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-icon border border-surface-line bg-surface-card text-v-d transition active:scale-[.96]"
          >
            <UserRound size={16} strokeWidth={2.2} />
          </Link>
        )}
        {!cabin && actions}
      </div>
      {cabin && <div className="mt-2.5 flex gap-2">{actions}</div>}
    </div>
  );
}
