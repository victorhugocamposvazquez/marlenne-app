export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import AjustesSection from '@/components/ajustes/AjustesSection';
import ForceSmsCronButton from '@/components/platform/ForceSmsCronButton';
import { requirePlatformAdmin } from '@/lib/require-platform-admin';
import { createClient } from '@/lib/supabase/server';
import { TZ, dateLbl } from '@/lib/time';
import { notFound } from 'next/navigation';

const when = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-row bg-surface-soft px-4 py-3">
      <p className="text-caption font-semibold text-ink-3">{label}</p>
      <p className="mt-0.5 text-body-lg font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function statusChip(status: string) {
  if (status === 'sent') return 'bg-ok-bg text-ok-fg';
  if (status === 'failed') return 'bg-danger-bg text-danger-fg';
  return 'bg-surface-bg text-ink-2';
}

export default async function PlatformCentroPage({ params }: { params: { id: string } }) {
  await requirePlatformAdmin();
  const sb = createClient();

  const [{ data: salon }, { data: config }, { data: template }, { count: staffCount }] = await Promise.all([
    sb.from('salons').select('id, name, timezone, opens_at, closes_at, created_at').eq('id', params.id).maybeSingle(),
    sb.from('sms_config').select('*').eq('salon_id', params.id).maybeSingle(),
    sb.from('sms_templates').select('nombre, cuerpo, updated_at').eq('salon_id', params.id)
      .eq('clave', 'recordatorio_cita').maybeSingle(),
    sb.from('staff').select('*', { count: 'exact', head: true }).eq('salon_id', params.id).eq('is_active', true),
  ]);

  if (!salon) notFound();

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [{ data: logs }, { data: failedWeek }, { data: queued }, { data: cronRuns }] = await Promise.all([
    sb.from('sms_log')
      .select('id, status, to_phone, body, sent_at, created_at, simulated, delivered_at, error_message, origin')
      .eq('salon_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
    sb.from('sms_log').select('id').eq('salon_id', params.id).eq('status', 'failed').gte('created_at', weekAgo),
    sb.from('sms_log').select('id').eq('salon_id', params.id).eq('status', 'queued'),
    sb.from('platform_cron_runs').select('ok, summary, ran_at').eq('job', 'sms')
      .order('ran_at', { ascending: false }).limit(5),
  ]);

  const lastCron = cronRuns?.[0] ?? null;
  const modeLabel = config?.reminder_mode === 'hours_before'
    ? `${config.reminder_hours_before} h antes`
    : `Día anterior a las ${config?.reminder_send_hour ?? 21}:00`;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/platform/centros"
          aria-label="Volver a centros"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-track text-ink"
        >
          <ChevronLeft size={22} strokeWidth={2.4} aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h1 font-bold tracking-[-.03em]">{salon.name}</h1>
          <p className="text-body text-ink-2">{salon.timezone} · Alta {dateLbl(salon.created_at)}</p>
        </div>
        <ForceSmsCronButton salonId={salon.id} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Equipo activo" value={staffCount ?? 0} />
        <Stat label="En cola" value={queued?.length ?? 0} />
        <Stat label="Fallidos (7 días)" value={failedWeek?.length ?? 0} />
        <Stat label="Último cron" value={lastCron ? (lastCron.ok ? 'OK' : 'Error') : '—'} />
      </div>

      <AjustesSection title="Configuración SMS" className="mt-6">
        <dl className="divide-y divide-surface-line py-1 text-body">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-ink-2">Estado</dt>
            <dd className="font-semibold text-ink">{config?.enabled ? 'Activo' : 'Apagado'}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-ink-2">Modo</dt>
            <dd className="font-semibold text-ink">{modeLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-ink-2">Prueba</dt>
            <dd className="font-semibold text-ink">{config?.test_mode ? 'Sí (simulado)' : 'No (real)'}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-ink-2">Zona horaria</dt>
            <dd className="font-semibold text-ink">{config?.timezone ?? salon.timezone}</dd>
          </div>
        </dl>
      </AjustesSection>

      {template && (
        <AjustesSection title="Plantilla">
          <p className="py-3 text-body font-semibold text-ink">{template.nombre}</p>
          <pre className="whitespace-pre-wrap border-t border-surface-line py-3 text-body leading-snug text-ink-2">
            {template.cuerpo}
          </pre>
        </AjustesSection>
      )}

      <AjustesSection title="Salud">
        {lastCron ? (
          <p className="py-3 text-body text-ink-2">
            Último cron SMS: {when.format(new Date(lastCron.ran_at))}
            {' · '}
            {lastCron.ok ? 'Correcto' : 'Con errores'}
          </p>
        ) : (
          <p className="py-3 text-body text-ink-2">Sin ejecuciones registradas del cron SMS.</p>
        )}
        {(cronRuns ?? []).length > 1 && (
          <ul className="border-t border-surface-line py-1 text-label text-ink-3">
            {(cronRuns ?? []).slice(1).map((run, i) => (
              <li key={i} className="py-2">
                {when.format(new Date(run.ran_at))} · {run.ok ? 'OK' : 'Error'}
              </li>
            ))}
          </ul>
        )}
      </AjustesSection>

      <AjustesSection title="SMS recientes">
        {(logs ?? []).length === 0 ? (
          <p className="py-4 text-body text-ink-2">Sin envíos todavía.</p>
        ) : (
          (logs ?? []).map(log => (
            <div key={log.id} className="border-b border-surface-line py-4 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-badge px-2.5 py-1 text-caption font-bold ${statusChip(log.status)}`}>
                  {log.status}
                </span>
                {log.simulated && (
                  <span className="rounded-badge bg-v-soft px-2.5 py-1 text-caption font-bold text-v-d">
                    Simulado
                  </span>
                )}
                {log.origin === 'prueba' && (
                  <span className="rounded-badge bg-surface-bg px-2.5 py-1 text-caption font-bold text-ink-2">
                    Prueba
                  </span>
                )}
                <span className="text-caption text-ink-3">{log.to_phone}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-body text-ink-2">{log.body}</p>
              <p className="mt-1 text-caption text-ink-3">
                {when.format(new Date(log.sent_at ?? log.created_at))}
                {log.delivered_at && ` · Entregado ${when.format(new Date(log.delivered_at))}`}
                {log.error_message && ` · ${log.error_message}`}
              </p>
            </div>
          ))
        )}
      </AjustesSection>
    </div>
  );
}
