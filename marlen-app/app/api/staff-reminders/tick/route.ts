import { getSession } from '@/lib/queries';
import {
  dispatchPersonalTaskReminders,
  dispatchSalonTaskReminders,
  dispatchStaffReminders,
} from '@/lib/staff-reminder-send';

export const runtime = 'nodejs';

/**
 * Mientras haya alguien del equipo con la app abierta, dispara los avisos
 * de citas (~30 min) y tareas con remind_at vencido. El cron hace lo mismo
 * con la PWA cerrada.
 */
export async function POST() {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });

  try {
    const result = await dispatchStaffReminders({ salonId: me.salon_id });
    await dispatchPersonalTaskReminders({ userId: me.id });
    await dispatchSalonTaskReminders({ salonId: me.salon_id });
    const missingKeys = result.error?.startsWith('Faltan VAPID');
    return Response.json(result, { status: result.ok || missingKeys ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al avisar al equipo';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
