'use client';

import Link from 'next/link';
import { CalendarPlus, MessageCircle } from 'lucide-react';
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
    <div className="flex items-center gap-2 rounded-row border border-surface-line bg-surface-card p-3 shadow-card">
      <Link href={`/clientas/${row.client_id}`} className="min-w-0 flex-1">
        <div className="truncate text-body font-bold tracking-[-.01em]">{row.full_name}</div>
        <div className="truncate text-caption font-medium text-ink-3">
          {row.service_name ?? 'Última visita'} · {agoLbl(row.last_at)}
        </div>
      </Link>
      <Link
        href={`/agenda?new=1&client=${row.client_id}${servicio}`}
        aria-label={`Dar cita a ${row.full_name}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-icon border border-surface-line bg-surface-card text-v-d transition active:scale-[.96]"
      >
        <CalendarPlus size={16} strokeWidth={2.2} />
      </Link>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp a ${row.full_name}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-icon bg-ok-bg text-ok-fg transition active:scale-[.96]"
        >
          <MessageCircle size={16} strokeWidth={2.2} />
        </a>
      )}
    </div>
  );
}
