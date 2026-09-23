import { authorizeCronRequest } from '@/lib/sms/auth-cron';
import { dispatchStaffReminders } from '@/lib/staff-reminder-send';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/** Cada 5 minutos: aviso al equipo de las citas que empiezan en media hora. */
export async function GET(req: Request) {
  if (!authorizeCronRequest(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await dispatchStaffReminders();
    const supabase = createAdminClient();
    await supabase.from('platform_cron_runs').insert({
      job: 'staff-reminders',
      ok: result.ok,
      summary: result,
    });
    const missingKeys = result.error?.startsWith('Faltan VAPID');
    return Response.json(result, { status: result.ok || missingKeys ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error en avisos al equipo';
    console.error('[cron/staff-reminders]', message);
    try {
      const supabase = createAdminClient();
      await supabase.from('platform_cron_runs').insert({
        job: 'staff-reminders',
        ok: false,
        summary: { error: message },
      });
    } catch {
      // sin bloquear la respuesta
    }
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
