'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { catStyle } from '@/lib/categories';
import { dateLbl } from '@/lib/time';
import { updateTreatment } from '@/lib/client-write';
import { createClient } from '@/lib/supabase/client';
import AutoGrowTextarea from '@/components/AutoGrowTextarea';
import { buttonClass } from '@/components/ui/Button';
import { inputCls } from '@/components/Sheet';
import type { TreatmentRow } from '@/lib/types';
import { Empty } from './Tabs';

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
          className={buttonClass({ className: 'px-4' })}
        >
          <CalendarPlus size={16} strokeWidth={2.2} />
          Dar cita
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {treatments.map(t => (
        <TreatmentCard key={t.id} t={t} clientId={clientId} />
      ))}
    </div>
  );
}

function TreatmentCard({ t, clientId }: { t: TreatmentRow; clientId: string }) {
  const cat = catStyle(t.service?.category ?? 'corporal');
  const open = !t.closed_at;
  const [note, setNote] = useState(t.note ?? '');
  const [zone, setZone] = useState(t.zone ?? '');
  const [total, setTotal] = useState(String(t.sessions_total || 1));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setNote(t.note ?? '');
    setZone(t.zone ?? '');
    setTotal(String(t.sessions_total || 1));
  }, [t.note, t.zone, t.sessions_total]);
  const params = Object.entries(t.last_params ?? {});
  const sessionsTotal = t.sessions_total || 1;
  const pct = Math.min(100, Math.round((100 * t.sessions_done) / sessionsTotal));

  const save = (patch: { note?: string | null; zone?: string | null; sessions_total?: number }) => {
    setErr(null);
    void updateTreatment(createClient(), { id: t.id, ...patch }).then(r => {
      if (!r.ok) setErr(r.error ?? 'No se ha podido guardar');
    });
  };

  return (
    <article className="rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
      <div className="flex items-start gap-2.5">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cat.color }} />
        <div className="min-w-0 flex-1">
          <h3 className="text-body font-bold leading-tight tracking-[-.01em]">
            {t.service?.name ?? 'Tratamiento'}
          </h3>
          <p className="mt-0.5 text-caption font-medium text-ink-3">
            {t.provider?.full_name ?? '—'}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-badge px-2 py-1 text-micro font-bold ${
            open ? 'bg-ok-bg text-ok-fg' : 'bg-surface-bg text-ink-3'
          }`}
        >
          {open ? 'Abierto' : `Cerrado ${dateLbl(t.closed_at!)}`}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded bg-surface-line">
          <div className="h-1.5 rounded bg-grad" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-caption font-bold tabular-nums text-ink-2">
          {t.sessions_done}/{sessionsTotal} sesiones
        </span>
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Zona</span>
            <input
              className={inputCls}
              placeholder="Abdomen, facial…"
              value={zone}
              onChange={e => setZone(e.target.value)}
              onBlur={() => {
                if (zone.trim() === (t.zone ?? '').trim()) return;
                save({ zone });
              }}
            />
          </label>
          <label>
            <span className="mb-1 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Sesiones pactadas</span>
            <input
              className={inputCls}
              inputMode="numeric"
              value={total}
              onChange={e => setTotal(e.target.value)}
              onBlur={() => {
                const n = Number(total);
                if (!Number.isFinite(n) || n === sessionsTotal) return;
                save({ sessions_total: n });
              }}
            />
          </label>
        </div>
      )}

      {params.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-caption font-bold uppercase tracking-[.03em] text-ink-2">
            Última sesión
          </div>
          <div className="flex flex-wrap gap-1.5">
            {params.map(([k, v]) => (
              <span key={k} className="rounded-chip bg-surface-bg px-2 py-1 text-caption font-semibold text-ink-2">
                {k} <span className="font-bold text-ink">{String(v)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {open ? (
        <label className="mt-3 block">
          <span className="mb-1 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Nota clínica</span>
          <AutoGrowTextarea
            className={`${inputCls} resize-none`}
            placeholder="Reacción, siguiente cita, parámetros que no se olviden…"
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => {
              if (note.trim() === (t.note ?? '').trim()) return;
              save({ note });
            }}
          />
        </label>
      ) : t.note ? (
        <p className="mt-3 rounded-chip bg-v-tint px-3 py-2 text-label font-medium leading-snug text-ink-2">
          {t.note}
        </p>
      ) : null}

      {err && <p className="mt-2 text-caption font-semibold text-danger-fg">{err}</p>}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="text-micro font-semibold text-ink-3">Abierto el {dateLbl(t.opened_at)}</p>
        {open && t.service?.name && (
          <Link
            href={`/agenda?new=1&client=${clientId}&servicio=${encodeURIComponent(t.service.name)}`}
            className="inline-flex items-center gap-1 text-label font-bold text-v-d"
          >
            <CalendarPlus size={14} strokeWidth={2.2} />
            Nueva sesión
          </Link>
        )}
      </div>
    </article>
  );
}
