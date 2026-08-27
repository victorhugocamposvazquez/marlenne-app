import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { CATEGORIES, STATUS } from '@/lib/categories';
import { dateLbl, fmt, minutesOfDay, offsetFromDay } from '@/lib/time';
import type { AgendaAppt } from '@/lib/types';
import { Empty } from './Tabs';

export default function HistoryTab({
  appointments, clientId,
}: {
  appointments: AgendaAppt[];
  clientId: string;
}) {
  if (!appointments.length) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Empty>No hay citas registradas todavía.</Empty>
        <Link
          href={`/agenda?new=1&client=${clientId}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-field bg-grad px-4 text-body font-extrabold text-white shadow-btn transition active:scale-[.97]"
        >
          <CalendarPlus size={16} strokeWidth={2.2} />
          Dar cita
        </Link>
      </div>
    );
  }

  const spent = appointments
    .filter(a => a.status === 'done')
    .reduce((s, a) => s + (a.price_cents ?? 0), 0) / 100;

  return (
    <>
      <div className="mb-2.5 flex gap-2.5">
        <div className="flex-1 rounded-row border border-surface-line bg-surface-card p-3 shadow-card">
          <div className="text-micro font-bold uppercase tracking-[.03em] text-ink-3">Citas</div>
          <div className="mt-0.5 text-title font-extrabold tabular-nums">{appointments.length}</div>
        </div>
        <div className="flex-1 rounded-row border border-surface-line bg-surface-card p-3 shadow-card">
          <div className="text-micro font-bold uppercase tracking-[.03em] text-ink-3">Gastado</div>
          <div className="mt-0.5 text-title font-extrabold tabular-nums">{spent} €</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {appointments.map(a => {
          const cat = CATEGORIES[a.category];
          const st = STATUS[a.status];
          return (
            <Link
              key={a.id}
              href={`/agenda?day=${offsetFromDay(a.starts_at)}&appt=${a.id}`}
              className="flex items-center gap-3 rounded-row border border-surface-line bg-surface-card p-3 shadow-card transition hover:border-v/40"
            >
              <span className="w-[62px] shrink-0 text-center">
                <span className="block text-caption font-bold leading-tight tabular-nums text-ink-2">
                  {dateLbl(a.starts_at)}
                </span>
                <span className="block text-micro font-semibold tabular-nums text-ink-3">
                  {fmt(minutesOfDay(a.starts_at))}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-bold tracking-[-.01em]">{a.service_name}</span>
                <span className="block truncate text-caption font-medium text-ink-3">
                  {a.provider_name}{a.note ? ` · ${a.note}` : ''}
                </span>
              </span>
              <span
                className="shrink-0 rounded-badge px-2 py-1 text-micro font-bold"
                style={{ background: cat.bg, color: st.edge }}
              >
                {st.label}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
