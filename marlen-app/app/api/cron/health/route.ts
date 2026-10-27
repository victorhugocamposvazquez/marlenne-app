import { authorizeCronRequest } from '@/lib/sms/auth-cron';
import { runPlatformMonitor } from '@/lib/monitor/run';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Monitor de servicios críticos → alertas por correo (OPS_ALERT_EMAIL).
 * No está en vercel.json (Hobby solo permite 1 cron diario): lo dispara el cron SMS
 * y también se puede llamar a mano con CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!authorizeCronRequest(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await runPlatformMonitor();
    return Response.json(result, { status: result.ok ? 200 : 503 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error en monitor';
    console.error('[cron/health]', message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
