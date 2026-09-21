'use client';

import Link from 'next/link';
import { agoLbl } from '@/lib/time';
import { waHref, waRecallMsg } from '@/lib/phone';
import DarCitaLink from '@/components/ui/DarCitaLink';
import WhatsAppLink from '@/components/ui/WhatsAppLink';
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
      <DarCitaLink
        href={`/agenda?new=1&client=${row.client_id}${servicio}`}
        ariaLabel={`Dar cita a ${row.full_name}`}
      />
      {wa && <WhatsAppLink href={wa} label={`WhatsApp a ${row.full_name}`} />}
    </div>
  );
}
