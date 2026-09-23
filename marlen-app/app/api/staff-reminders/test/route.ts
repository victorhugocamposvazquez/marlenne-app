import { getSession } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchStaffReminders } from '@/lib/staff-reminder-send';

export const runtime = 'nodejs';

/** Prueba: suelta el aviso de la próxima cita de este centro, aunque no falten 30 minutos. */
export async function POST() {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });

  const supabase = createAdminClient();
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
