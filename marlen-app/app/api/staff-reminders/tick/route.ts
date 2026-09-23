import { getSession } from '@/lib/queries';
import { dispatchStaffReminders } from '@/lib/staff-reminder-send';

export const runtime = 'nodejs';

/**
 * Mientras haya alguien del equipo con la app abierta, dispara los avisos
 * de las citas que entran en los próximos 30 minutos. El cron hace lo mismo
 * si nadie tiene la PWA en primer plano.
 */
export async function POST() {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });

  try {
    const result = await dispatchStaffReminders({ salonId: me.salon_id });
    const missingKeys = result.error?.startsWith('Faltan VAPID');
    return Response.json(result, { status: result.ok || missingKeys ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al avisar al equipo';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
