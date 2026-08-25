import { CATEGORIES } from '@/lib/categories';
import { dateLbl } from '@/lib/time';
import type { TreatmentRow } from '@/lib/types';
import { Empty } from './Tabs';
import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';

export default function TreatmentsTab({
  treatments, clientId,
}: {
  treatments: TreatmentRow[];
  clientId: string;
}) {
  if (!treatments.length) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Empty>Esta clienta todavía no tiene tratamientos. Se abren al marcar una cita como hecha.</Empty>
        <Link
          href={`/agenda?new=1&client=${clientId}`}
          className="inline-flex items-center gap-1.5 rounded-field bg-grad px-4 py-2.5 text-[13px] font-extrabold text-white shadow-btn"
        >
          <CalendarPlus size={16} strokeWidth={2.2} />
          Dar cita
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {treatments.map(t => {
        const cat = CATEGORIES[t.service?.category ?? 'corporal'];
        const total = t.sessions_total || 1;
        const pct = Math.min(100, Math.round((100 * t.sessions_done) / total));
        const params = Object.entries(t.last_params ?? {});
        const open = !t.closed_at;

        return (
          <article key={t.id} className="rounded-row border border-surface-line bg-white p-3.5 shadow-card">
            <div className="flex items-start gap-2.5">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cat.color }} />
              <div className="min-w-0 flex-1">
                <h3 className="text-[14.5px] font-bold leading-tight tracking-[-.01em]">
                  {t.service?.name ?? 'Tratamiento'}
                </h3>
                <p className="mt-0.5 text-[11.5px] font-medium text-ink-3">
                  {[t.zone, t.provider?.full_name].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-[9px] px-2 py-1 text-[10px] font-bold ${
                  open ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-bg text-ink-3'
                }`}
              >
                {open ? 'Abierto' : `Cerrado ${dateLbl(t.closed_at!)}`}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-surface-line">
                <div className="h-1.5 rounded bg-grad" style={{ width: `${pct}%` }} />
              </div>
              <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-ink-2">
                {t.sessions_done}/{total} sesiones
              </span>
            </div>

            {params.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[.03em] text-ink-3">
                  Última sesión
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {params.map(([k, v]) => (
                    <span key={k} className="rounded-chip bg-surface-bg px-2 py-1 text-[11px] font-semibold text-ink-2">
                      {k} <span className="font-bold text-ink">{String(v)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {t.note && (
              <p className="mt-3 rounded-[12px] bg-v-tint px-3 py-2 text-[12px] font-medium leading-snug text-ink-2">
                {t.note}
              </p>
            )}

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <p className="text-[10.5px] font-semibold text-ink-3">Abierto el {dateLbl(t.opened_at)}</p>
              {open && t.service?.name && (
                <Link
                  href={`/agenda?new=1&client=${clientId}&servicio=${encodeURIComponent(t.service.name)}`}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-v-d"
                >
                  <CalendarPlus size={14} strokeWidth={2.2} />
                  Nueva sesión
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
