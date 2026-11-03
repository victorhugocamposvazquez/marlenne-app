import type { BrevoUsageSnapshot } from '@/lib/brevo-usage';

function pct(used: number, limit: number | null): number | null {
  if (limit == null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default function BrevoUsageCard({ usage }: { usage: BrevoUsageSnapshot }) {
  const dayUsed = usage.todayRequests ?? usage.appSentToday;
  const dayPct = pct(dayUsed, usage.dailyLimit);
  const tone =
    !usage.configured || usage.error
      ? { bg: '#FEE2E2', fg: '#B3123B', label: 'Sin configurar' }
      : dayPct != null && dayPct >= 90
        ? { bg: '#FEE2E2', fg: '#B3123B', label: 'Casi al límite' }
        : dayPct != null && dayPct >= 70
          ? { bg: '#FEF3C7', fg: '#B45309', label: 'Alto uso' }
          : { bg: '#E7F8EE', fg: '#15803D', label: 'OK' };

  const when = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className="rounded-card border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold">Correo · Brevo</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            Transaccional (reservas, avisos). Límites del plan y uso de Marlén.
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {tone.label}
        </span>
      </div>

      {usage.error && (
        <p className="mt-3 rounded-[12px] bg-danger/10 px-3 py-2 text-[13px] font-semibold text-danger">
          {usage.error}
        </p>
      )}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Plan Brevo"
          value={usage.planType ?? '—'}
          hint={usage.accountEmail ?? usage.companyName ?? undefined}
        />
        <Stat
          label="Hoy (Brevo)"
          value={
            usage.dailyLimit != null
              ? `${dayUsed} / ${usage.dailyLimit}`
              : dayUsed != null
                ? String(dayUsed)
                : '—'
          }
          hint={dayPct != null ? `${dayPct} % del tope diario` : 'Sin tope diario fijo'}
        />
        <Stat
          label="Créditos restantes"
          value={
            usage.creditsRemaining != null
              ? usage.creditsRemaining.toLocaleString('es-ES')
              : '—'
          }
          hint={usage.creditsType ?? undefined}
        />
        <Stat
          label="Marlén · mes"
          value={usage.appSentMonth.toLocaleString('es-ES')}
          hint={`Hoy ${usage.appSentToday} ok · ${usage.appFailedToday} fallos`}
        />
      </dl>

      {usage.dailyLimit != null && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[12px] font-semibold text-ink-2">
            <span>Cupo diario free</span>
            <span>
              {dayUsed} / {usage.dailyLimit}
            </span>
          </div>
          <span className="block h-2 overflow-hidden rounded-pill bg-line">
            <span
              className="block h-full rounded-pill bg-brand-pink"
              style={{ width: `${dayPct ?? 0}%` }}
            />
          </span>
        </div>
      )}

      {usage.last14Requests != null && (
        <p className="mt-3 text-[12px] text-ink-3">
          Últimos 14 días (Brevo): {usage.last14Requests.toLocaleString('es-ES')} solicitudes
          {usage.relayEnabled === false ? ' · relay desactivado' : ''}
        </p>
      )}

      {usage.recent.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-[14px] border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-page text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2 font-semibold">Cuándo</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Para</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {usage.recent.map(row => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-2 whitespace-nowrap text-ink-2">
                    {when.format(new Date(row.created_at))}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.kind}</td>
                  <td className="max-w-[180px] truncate px-3 py-2">{row.to_email}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.status === 'sent'
                          ? 'font-semibold text-[#15803D]'
                          : 'font-semibold text-danger'
                      }
                    >
                      {row.status === 'sent' ? 'Enviado' : 'Fallido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[14px] bg-page p-4">
      <dt className="text-[12px] font-semibold text-ink-2">{label}</dt>
      <dd className="mt-1 text-[15px] font-bold capitalize">{value}</dd>
      {hint && <p className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}
