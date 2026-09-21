export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ajustesCardCls, ajustesGroupTitleCls } from '@/components/ajustes/AjustesSection';
import PlatformSchemaBanner from '@/components/platform/PlatformSchemaBanner';
import PageHeading from '@/components/ui/PageHeading';
import { requirePlatformAdmin } from '@/lib/require-platform-admin';
import { isSmsSchemaMissing } from '@/lib/sms/setup';
import { createClient } from '@/lib/supabase/server';
import { TZ } from '@/lib/time';

type SalonRow = {
  id: string;
  name: string;
  timezone: string;
  enabled: boolean;
  test_mode: boolean;
  queue: number;
  sentToday: number;
};

function startOfTodayMadrid() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return new Date(`${y}-${m}-${d}T00:00:00+02:00`).toISOString();
}

export default async function PlatformCentrosPage() {
  await requirePlatformAdmin();
  const sb = createClient();
  const todayStart = startOfTodayMadrid();

  const [{ data: salons }, configRes, queuedRes, sentTodayRes] = await Promise.all([
    sb.from('salons').select('id, name, timezone').order('name'),
    sb.from('sms_config').select('salon_id, enabled, test_mode'),
    sb.from('sms_log').select('salon_id').eq('status', 'queued'),
    sb.from('sms_log').select('salon_id').eq('status', 'sent').gte('sent_at', todayStart),
  ]);
  const schemaMissing = isSmsSchemaMissing(configRes.error)
    || isSmsSchemaMissing(queuedRes.error)
    || isSmsSchemaMissing(sentTodayRes.error);
  const configs = configRes.data;
  const queued = queuedRes.data;
  const sentToday = sentTodayRes.data;

  const configBySalon = new Map((configs ?? []).map(c => [c.salon_id, c]));
  const queueBySalon = new Map<string, number>();
  for (const row of queued ?? []) {
    if (!row.salon_id) continue;
    queueBySalon.set(row.salon_id, (queueBySalon.get(row.salon_id) ?? 0) + 1);
  }
  const sentBySalon = new Map<string, number>();
  for (const row of sentToday ?? []) {
    if (!row.salon_id) continue;
    sentBySalon.set(row.salon_id, (sentBySalon.get(row.salon_id) ?? 0) + 1);
  }

  const rows: SalonRow[] = (salons ?? []).map(s => {
    const cfg = configBySalon.get(s.id);
    return {
      id: s.id,
      name: s.name,
      timezone: s.timezone,
      enabled: cfg?.enabled ?? false,
      test_mode: cfg?.test_mode ?? true,
      queue: queueBySalon.get(s.id) ?? 0,
      sentToday: sentBySalon.get(s.id) ?? 0,
    };
  });

  return (
    <div>
      {schemaMissing && <PlatformSchemaBanner />}
      <PageHeading title="Centros" subtitle={`${rows.length} salones`} />
      <section className="mt-8">
        <h2 className={ajustesGroupTitleCls}>SMS por centro</h2>
        <div className={ajustesCardCls}>
          {rows.length === 0 ? (
            <p className="py-4 text-body text-ink-2">No hay centros.</p>
          ) : rows.map(row => (
            <Link
              key={row.id}
              href={`/platform/centros/${row.id}`}
              className="flex min-h-[52px] items-center gap-3 border-b border-surface-line py-4 text-ink no-underline last:border-0 hover:text-ink"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body-lg font-bold">{row.name}</span>
                <span className="mt-0.5 block text-body leading-snug text-ink-2">
                  {row.enabled ? 'SMS activo' : 'SMS apagado'}
                  {' · '}
                  {row.test_mode ? 'Modo prueba' : 'Producción'}
                  {' · '}
                  Cola {row.queue}
                  {' · '}
                  Hoy {row.sentToday}
                </span>
              </span>
              <ChevronRight size={20} strokeWidth={2.2} className="shrink-0 text-ink-3" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
