import { getSession } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';

type PushBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

function parseSub(body: PushBody) {
  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth || endpoint.length > 2000) return null;
  return { endpoint, p256dh, auth };
}

/** Guarda el dispositivo del miembro que ha entrado. */
export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });

  let body: PushBody;
  try {
    body = await req.json() as PushBody;
  } catch {
    return Response.json({ ok: false, error: 'Suscripción incompleta' }, { status: 400 });
  }
  const sub = parseSub(body);
  if (!sub) return Response.json({ ok: false, error: 'Suscripción incompleta' }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from('staff_push_subscriptions').upsert({
    staff_id: me.id,
    salon_id: me.salon_id,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
  }, { onConflict: 'endpoint' });

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
