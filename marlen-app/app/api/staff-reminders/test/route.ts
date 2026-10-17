import { getSession } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  dispatchPersonalTaskReminders,
  dispatchSalonTaskReminders,
  dispatchStaffReminders,
} from '@/lib/staff-reminder-send';

export const runtime = 'nodejs';

/**
 * Prueba de aviso push:
 * - Centro: próxima cita (aunque no falten 30 min).
 * - Personal: fuerza un push de prueba a este dispositivo + despacha tareas vencidas.
 */
export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => ({})) as { kind?: string };
  const kind = body.kind === 'tasks' ? 'tasks' : 'appointments';
  const supabase = createAdminClient();

  if (kind === 'tasks') {
    try {
      const personal = await dispatchPersonalTaskReminders({ userId: me.id });
      const salon = await dispatchSalonTaskReminders({ salonId: me.salon_id, staffId: me.id });
      const subs = await supabase
        .from('staff_push_subscriptions')
        .select('id, endpoint, p256dh, auth, staff_id')
        .eq('staff_id', me.id);
      if (subs.error) {
        return Response.json({ ok: false, sent: 0, error: subs.error.message }, { status: 500 });
      }
      const list = subs.data ?? [];
      if (list.length === 0) {
        return Response.json({
          ok: false,
          sent: 0,
          error: 'Activa Push en el teléfono (Ajustes → avisos) e instala la app en inicio.',
        });
      }

      // Push de prueba inmediato a este usuario (aunque no haya tareas vencidas).
      const webpush = (await import('web-push')).default;
      const pub = process.env.VAPID_PUBLIC_KEY?.trim();
      const priv = process.env.VAPID_PRIVATE_KEY?.trim();
      if (!pub || !priv) {
        return Response.json({ ok: false, sent: 0, error: 'Faltan claves VAPID en el servidor.' }, { status: 500 });
      }
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT?.trim() || 'mailto:hola@marlen.app',
        pub,
        priv,
      );
      let delivered = 0;
      const payload = JSON.stringify({
        title: 'Marlén',
        body: 'Prueba de aviso de tareas',
        url: '/tareas',
        tag: `task-test-${Date.now()}`,
      });
      for (const sub of list) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 20 * 60, urgency: 'high' },
          );
          delivered += 1;
        } catch {
          /* suscripción caducada */
        }
      }
      return Response.json({
        ok: delivered > 0,
        sent: delivered,
        personal,
        salon,
        error: delivered === 0
          ? 'El aviso no ha salido. Revisa el permiso de notificaciones de Marlén en el iPhone.'
          : undefined,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al probar el aviso';
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('id')
    .eq('salon_id', me.salon_id)
    .eq('status', 'prog')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) {
    return Response.json({
      ok: false,
      due: 0,
      sent: 0,
      error: 'No hay ninguna cita programada más tarde de ahora.',
    });
  }

  await supabase.from('appointments').update({ staff_reminded_at: null }).eq('id', data.id);

  try {
    const result = await dispatchStaffReminders({
      salonId: me.salon_id,
      appointmentIds: [data.id],
    });
    return Response.json({
      ...result,
      error: result.sent === 0
        ? (result.hint || result.error || 'El aviso no ha salido. Activa Citas próximas en este teléfono.')
        : result.error,
    }, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al probar el aviso';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
