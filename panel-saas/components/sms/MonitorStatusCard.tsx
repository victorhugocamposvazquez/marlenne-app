'use client';

import type { MonitorSnapshot } from '@/lib/live-center';

const when = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default function MonitorStatusCard({ snapshot }: { snapshot: MonitorSnapshot }) {
  const last = snapshot.lastHealthAt
    ? when.format(new Date(snapshot.lastHealthAt))
    : 'aún no ha corrido';
  const ok = snapshot.lastHealthOk;
  const tone =
    ok === true
      ? { bg: '#E7F8EE', fg: '#15803D', label: 'OK' }
      : ok === false
        ? { bg: '#FEE2E2', fg: '#B3123B', label: 'Fallos' }
        : { bg: '#F3F2F7', fg: '#6E6B7B', label: 'Sin datos' };

  return (
    <section className="rounded-card border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold">Monitorización</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            SMS, crons, Supabase y app · alertas a OPS_ALERT_EMAIL
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {tone.label}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[14px] bg-page p-4">
          <dt className="text-[12px] font-semibold text-ink-2">Último chequeo</dt>
          <dd className="mt-1 text-[15px] font-bold">{last}</dd>
        </div>
        <div className="rounded-[14px] bg-page p-4">
          <dt className="text-[12px] font-semibold text-ink-2">Alertas abiertas</dt>
          <dd className="mt-1 text-[15px] font-bold">{snapshot.openAlerts}</dd>
        </div>
      </dl>
    </section>
  );
}
