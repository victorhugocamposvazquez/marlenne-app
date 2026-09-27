import { getSession } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchPersonalTaskReminders, dispatchStaffReminders } from '@/lib/staff-reminder-send';

export const runtime = 'nodejs';

/**
 * Prueba de aviso push.
 * - Trabajo: la próxima cita (aunque no falten 30 min).
 * - Personal: la próxima tarea con aviso, o un aviso de prueba suelto.
 */
export async function POST() {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });

  const supabase = createAdminClient();

  if (me.workspace === 'personal') {
    const { data: task } = await supabase
      .from('personal_tasks')
      .select('id')
      .eq('user_id', me.id)
      .is('done_at', null)
      .not('remind_at', 'is', null)
      .order('remind_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (task?.id) {
      await supabase.from('personal_tasks').update({ reminded_at: null, remind_at: new Date().toISOString() }).eq('id', task.id);
    } else {
      const salonId = (await supabase
        .from('salons')
        .select('id')
        .eq('kind', 'personal')
        .eq('owner_user_id', me.id)
        .maybeSingle()).data?.id;
      if (!salonId) {
        return Response.json({
          ok: false,
          sent: 0,
          error: 'Crea una tarea con aviso (15 min / 1 h / 1 día) y vuelve a probar.',
        });
      }
      const { error: insertError } = await supabase.from('personal_tasks').insert({
        salon_id: salonId,
        user_id: me.id,
        title: 'Prueba de aviso',
        remind_at: new Date().toISOString(),
      });
      if (insertError) {
        return Response.json({ ok: false, sent: 0, error: insertError.message }, { status: 500 });
      }
    }

    try {
      const result = await dispatchPersonalTaskReminders({ userId: me.id });
      return Response.json({
        ...result,
        error: result.sent === 0
          ? (result.error || 'El aviso no ha salido. Activa los avisos en este teléfono (Ajustes → Tu cuenta).')
          : result.error,
      }, { status: result.ok ? 200 : 500 });
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
