import { authorizeCronRequest } from '@/lib/sms/auth-cron';
import { runPlatformMonitor } from '@/lib/monitor/run';
import { processDueReminders } from '@/lib/sms/reminders';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Cron diario (Hobby: 1 job/día).
 * 1) Recordatorios SMS LabsMobile
 * 2) Monitor de servicios críticos (alertas por correo)
 * El endpoint /api/cron/health sigue disponible para disparo manual con CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!authorizeCronRequest(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createAdminClient();
  let sms: Awaited<ReturnType<typeof processDueReminders>> | { error: string } | null = null;
  let smsOk = false;

  try {
    const salonId = new URL(req.url).searchParams.get('salon_id') ?? undefined;
    const result = await processDueReminders({ salonId });
    sms = result;
    smsOk = result.failed === 0
      && !result.errors.some((e) => e.includes('no configurado'));

    await supabase.from('platform_cron_runs').insert({
      job: 'sms',
      ok: smsOk,
      summary: result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error en cron SMS';
    console.error('[cron/sms]', message);
    sms = { error: message };
    try {
      await supabase.from('platform_cron_runs').insert({
        job: 'sms',
        ok: false,
        summary: { error: message },
      });
    } catch {
      // sin bloquear
    }
  }

  let health: Awaited<ReturnType<typeof runPlatformMonitor>> | { error: string } | null = null;
  try {
    health = await runPlatformMonitor();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error en monitor';
    console.error('[cron/sms→health]', message);
    health = { error: message };
  }

  const ok = smsOk && (!health || !('error' in health) && health.ok !== false);
  return Response.json({ ok, sms, health }, { status: ok ? 200 : 500 });
}
