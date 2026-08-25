import Link from 'next/link';
import { Phone } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { durLbl, fmt, minutesOfDay } from '@/lib/time';
import { setStatus } from '@/app/actions/appointments';
import type { AgendaAppt } from '@/lib/types';

export default function HoyApptRow({
  appt, late = false,
}: {
  appt: AgendaAppt;
  late?: boolean;
}) {
  const cat = CATEGORIES[appt.category];
  return (
    <div className={`flex items-center gap-2.5 rounded-row border p-3 shadow-card ${
      late ? 'border-pink-200 bg-pink-50' : 'border-surface-line bg-white'
    }`}
    >
      <Link href={`/agenda?appt=${appt.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="w-[52px] shrink-0 rounded-[13px] bg-v-tint py-[7px] text-center">
          <div className="text-[13.5px] font-extrabold leading-none text-v-d tabular-nums">
            {fmt(minutesOfDay(appt.starts_at))}
          </div>
          <div className="mt-0.5 text-[9.5px] font-semibold text-ink-3">{durLbl(appt.duration_min)}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold tracking-[-.01em]">{appt.client_label}</div>
          <div className="truncate text-[11.5px] font-medium text-ink-3">
            {appt.service_name} · {appt.provider_name}
            {late ? ' · retraso' : ''}
          </div>
        </div>
        <span className="shrink-0 rounded-[9px] px-2 py-1 text-[10px] font-bold" style={{ background: cat.bg, color: cat.fg }}>
          {cat.label}
        </span>
      </Link>
      <form action={setStatus}>
        <input type="hidden" name="id" value={appt.id} />
        <input type="hidden" name="status" value="curso" />
        <button className="shrink-0 rounded-[13px] bg-v px-3 py-2.5 text-[12px] font-bold text-white">Pasa</button>
      </form>
      <form action={setStatus}>
        <input type="hidden" name="id" value={appt.id} />
        <input type="hidden" name="status" value="noshow" />
        <button className="shrink-0 rounded-[13px] border border-pink-200 bg-white px-2.5 py-2.5 text-[12px] font-bold text-pink-700">
          No vino
        </button>
      </form>
      {late && appt.client_phone && (
        <a
          href={`tel:${appt.client_phone}`}
          aria-label={`Llamar a ${appt.client_label}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-surface-line bg-white text-v-d"
        >
          <Phone size={16} strokeWidth={2.2} />
        </a>
      )}
    </div>
  );
}
