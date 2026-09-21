import { authorizeCronRequest } from '@/lib/sms/auth-cron';
import { processDueReminders } from '@/lib/sms/reminders';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/** Cron cada 30 min: recordatorios SMS vencidos vía LabsMobile. */
export async function GET(req: Request) {
  if (!authorizeCronRequest(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const salonId = new URL(req.url).searchParams.get('salon_id') ?? undefined;
    const result = await processDueReminders({ salonId });
    const supabase = createAdminClient();
    const ok = result.failed === 0
      && !result.errors.some((e) => e.includes('no configurado'));

    await supabase.from('platform_cron_runs').insert({
      job: 'sms',
      ok,
      summary: result,
    });

    return Response.json({ ok, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error en cron SMS';
    console.error('[cron/sms]', message);

    try {
      const supabase = createAdminClient();
      await supabase.from('platform_cron_runs').insert({
        job: 'sms',
        ok: false,
        summary: { error: message },
      });
    } catch {
      // sin bloquear la respuesta
    }

    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
