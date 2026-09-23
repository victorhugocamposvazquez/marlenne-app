import { getSession } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';

/** Si esta persona quiere avisos de citas próximas. */
export async function GET() {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('staff')
    .select('notify_upcoming')
    .eq('id', me.id)
    .maybeSingle();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ enabled: Boolean(data?.notify_upcoming) });
}

/** Enciende o apaga los avisos de quien ha entrado. Apagar borra sus dispositivos. */
export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });

  let enabled: boolean;
  try {
    const body = await req.json() as { enabled?: boolean };
    if (typeof body.enabled !== 'boolean') {
      return Response.json({ ok: false, error: 'Falta el interruptor' }, { status: 400 });
    }
    enabled = body.enabled;
  } catch {
    return Response.json({ ok: false, error: 'Falta el interruptor' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('staff')
    .update({ notify_upcoming: enabled })
    .eq('id', me.id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  if (!enabled) {
    await supabase.from('staff_push_subscriptions').delete().eq('staff_id', me.id);
  }

  return Response.json({ enabled });
}
