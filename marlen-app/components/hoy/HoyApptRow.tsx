'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { catStyle } from '@/lib/categories';
import { durLbl, fmt, minutesOfDay } from '@/lib/time';
import { updateStatus } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { waConfirmMsg, waHref } from '@/lib/phone';
import WhatsAppLink from '@/components/ui/WhatsAppLink';
import ApptActionsMenu from '@/components/hoy/ApptActionsMenu';
import type { AgendaAppt } from '@/lib/types';

export default function HoyApptRow({
  appt, late = false, cabin = false,
}: {
  appt: AgendaAppt;
  late?: boolean;
  cabin?: boolean;
}) {
  const cat = catStyle(appt.category);
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

  const meta = [
    appt.service_name,
    !cabin ? appt.provider_name : null,
    late ? 'retraso' : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className={`rounded-row p-4 ${late ? 'bg-danger-bg' : 'bg-surface-soft'}`}>
      <div className="flex items-start gap-3">
        <Link href={`/agenda?appt=${appt.id}`} className="flex min-w-0 flex-1 items-start gap-3">
          <div className="w-[52px] shrink-0 rounded-icon bg-v-tint py-[7px] text-center">
            <div className="text-body font-extrabold leading-none text-v-d tabular-nums">
              {fmt(minutesOfDay(appt.starts_at))}
            </div>
            <div className="mt-0.5 text-micro font-semibold text-ink-3">{durLbl(appt.duration_min)}</div>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="truncate text-body font-bold tracking-[-.01em]">{appt.client_label}</div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-caption font-medium text-ink-2">{meta}</span>
              {!cabin && (
                <span
                  className="shrink-0 rounded-badge px-2 py-0.5 text-micro font-bold"
                  style={{ background: cat.bg, color: cat.fg }}
                >
                  {cat.label}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1 self-start">
          {wa && <WhatsAppLink href={wa} label={`WhatsApp a ${appt.client_label}`} />}
          {cabin && appt.client_id && (
            <Link
              href={`/clientas/${appt.client_id}`}
              aria-label={`Ficha de ${appt.client_label}`}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-track text-ink transition motion-safe:active:scale-[.96]"
            >
              <UserRound size={16} strokeWidth={2.2} />
            </Link>
          )}
          {!cabin && (
            <ApptActionsMenu
              clientLabel={appt.client_label}
              phone={late ? appt.client_phone : null}
              pending={pending}
              onPasa={() => set('curso')}
              onNoshow={() => set('noshow')}
            />
          )}
        </div>
      </div>

      {cabin && (
        <div className="mt-2.5 flex justify-end">
          <ApptActionsMenu
            clientLabel={appt.client_label}
            phone={late ? appt.client_phone : null}
            pending={pending}
            onPasa={() => set('curso')}
            onNoshow={() => set('noshow')}
            align="right"
          />
        </div>
      )}
    </div>
  );
}
