'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { agoLbl } from '@/lib/time';
import { waHref, waRecallMsg } from '@/lib/phone';
import type { RecallRow } from '@/lib/types';

export default function RecallCard({ row }: { row: RecallRow }) {
  const wa = waHref(row.phone, waRecallMsg({
    name: row.full_name,
    service: row.service_name,
    lastAt: row.last_at,
  }));
  const servicio = row.service_name ? `&servicio=${encodeURIComponent(row.service_name)}` : '';

  return (
    <div className="flex items-center gap-3 border-b border-surface-line py-3.5">
      <Link href={`/clientas/${row.client_id}`} className="min-w-0 flex-1">
        <div className="truncate text-body-lg font-semibold">{row.full_name}</div>
        <div className="truncate text-label text-ink-2">
          {row.service_name ?? 'Última visita'} · {agoLbl(row.last_at)}
        </div>
      </Link>
      <Link
        href={`/agenda?new=1&client=${row.client_id}${servicio}`}
        aria-label={`Dar cita a ${row.full_name}`}
        className="inline-flex h-[38px] shrink-0 items-center rounded-pill bg-ink px-3.5 text-label font-semibold text-white"
      >
        Dar cita
      </Link>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp a ${row.full_name}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-icon bg-ok-bg text-ok-fg transition motion-safe:active:scale-[.96]"
        >
          <MessageCircle size={16} strokeWidth={2.2} />
        </a>
      )}
    </div>
  );
}
