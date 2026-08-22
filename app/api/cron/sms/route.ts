import { createClient } from '@supabase/supabase-js';

/**
 * Recordatorio SMS 24 h antes. El envío queda para más adelante
 * (Labs Mobile). El stub habla con Twilio y, sin claves, no toca sms_log.
 */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Sin Twilio no hay nada que enviar: mejor no tocar sms_log, porque su
  // unique(appointment_id, to_phone) daría por avisada una cita que nunca lo fue.
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_FROM) {
    return Response.json({ ok: true, sent: 0, skipped: 'twilio sin configurar' });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const from = new Date(Date.now() + 24 * 3600 * 1000);
  const to = new Date(from.getTime() + 3600 * 1000);

  const { data: appts } = await sb
    .from('appointments')
    .select('id, starts_at, client:clients(full_name, phone, sms_opt_in), service:services(name), provider:staff!appointments_provider_id_fkey(full_name), salon:salons(name)')
    .eq('status', 'prog')
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString());

  let sent = 0;
  for (const a of appts ?? []) {
    const c: any = a.client;
    if (!c?.phone || !c.sms_opt_in) continue;

    const hora = new Date(a.starts_at).toLocaleTimeString('es-ES', {
      timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit',
    });
    const body = `Hola ${c.full_name.split(' ')[0]}, te recordamos tu cita mañana a las ${hora} en ${(a.salon as any).name} con ${(a.provider as any).full_name}.`;

    // sms_log tiene unique(appointment_id, to_phone): si ya existe, no reenvía.
    const { error } = await sb.from('sms_log').insert({
      appointment_id: a.id, to_phone: c.phone, body, status: 'queued',
    });
    if (error) continue;

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: c.phone, From: process.env.TWILIO_FROM!, Body: body }),
      },
    );

    await sb.from('sms_log')
      .update({ status: res.ok ? 'sent' : 'failed', sent_at: new Date().toISOString() })
      .eq('appointment_id', a.id).eq('to_phone', c.phone);

    if (res.ok) sent++;
  }

  return Response.json({ ok: true, sent });
}
