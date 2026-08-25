import Link from 'next/link';
import { CATEGORIES, STATUS } from '@/lib/categories';
import { dateLbl, fmt, minutesOfDay, offsetFromDay } from '@/lib/time';
import type { AgendaAppt } from '@/lib/types';
import { Empty } from './Tabs';

export default function HistoryTab({ appointments }: { appointments: AgendaAppt[] }) {
  if (!appointments.length) return <Empty>No hay citas registradas todavía.</Empty>;

  const spent = appointments
    .filter(a => a.status === 'done')
    .reduce((s, a) => s + (a.price_cents ?? 0), 0) / 100;

  return (
    <>
      <div className="mb-2.5 flex gap-2.5">
        <div className="flex-1 rounded-row border border-surface-line bg-white p-3 shadow-card">
          <div className="text-[10.5px] font-bold uppercase tracking-[.03em] text-ink-3">Citas</div>
          <div className="mt-0.5 text-[19px] font-extrabold tabular-nums">{appointments.length}</div>
        </div>
        <div className="flex-1 rounded-row border border-surface-line bg-white p-3 shadow-card">
          <div className="text-[10.5px] font-bold uppercase tracking-[.03em] text-ink-3">Gastado</div>
          <div className="mt-0.5 text-[19px] font-extrabold tabular-nums">{spent} €</div>
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
              className="flex items-center gap-3 rounded-row border border-surface-line bg-white p-3 shadow-card transition hover:border-v/40"
            >
              <span className="w-[62px] shrink-0 text-center">
                <span className="block text-[11.5px] font-bold leading-tight tabular-nums text-ink-2">
                  {dateLbl(a.starts_at)}
                </span>
                <span className="block text-[10.5px] font-semibold tabular-nums text-ink-3">
                  {fmt(minutesOfDay(a.starts_at))}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold tracking-[-.01em]">{a.service_name}</span>
                <span className="block truncate text-[11px] font-medium text-ink-3">
                  {a.provider_name}{a.note ? ` · ${a.note}` : ''}
                </span>
              </span>
              <span
                className="shrink-0 rounded-[9px] px-2 py-1 text-[10px] font-bold"
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
