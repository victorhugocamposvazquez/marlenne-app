import { NextResponse } from 'next/server';
import { authorizeWebhookSecret } from '@/lib/sms/auth-cron';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type AckFields = {
  subid?: string | null;
  msisdn?: string | null;
  status?: string | null;
  desc?: string | null;
  acklevel?: string | null;
};

/** LabsMobile marca entrega con desc=DELIVRD/acklevel=handset y error con status=ko/acklevel=error. */
function mapAckToStatus(ack: AckFields): 'delivered' | 'failed' | null {
  const desc = (ack.desc ?? '').toUpperCase();
  const level = (ack.acklevel ?? '').toLowerCase();
  const status = (ack.status ?? '').toLowerCase();

  if (desc === 'DELIVRD' || desc === 'READ' || level === 'handset') return 'delivered';
  if (status === 'ko' || level === 'error') return 'failed';
  if (['UNDELIV', 'EXPIRED', 'REJECTD', 'BLOCKED', 'UNKNOWN'].includes(desc)) return 'failed';
  return null;
}

async function applyAck(ack: AckFields): Promise<boolean> {
  const subid = ack.subid?.trim();
  const msisdn = ack.msisdn?.trim();
  if (!subid && !msisdn) return false;

  const mapped = mapAckToStatus(ack);
  if (!mapped) return false;

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { status: mapped };
  if (mapped === 'delivered') patch.delivered_at = nowIso;
  if (mapped === 'failed') {
    patch.error_message = `LabsMobile: ${ack.desc ?? ack.acklevel ?? 'error de entrega'}`;
  }

  const supabase = createAdminClient();
  let query = supabase.from('sms_log').update(patch);
  query = subid ? query.eq('provider_subid', subid) : query.eq('to_phone', msisdn!);

  const { error } = await query;
  if (error) {
    console.error('[webhooks/labsmobile] update', error.message);
    return false;
  }
  return true;
}

/** LabsMobile envía los ACK por http/GET a la URL configurada en `ackurl`. */
export async function GET(req: Request) {
  if (!authorizeWebhookSecret(req, 'LABSMOBILE_WEBHOOK_SECRET')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const updated = await applyAck({
    subid: params.get('subid'),
    msisdn: params.get('msisdn'),
    status: params.get('status'),
    desc: params.get('desc'),
    acklevel: params.get('acklevel'),
  });

  return NextResponse.json({ ok: true, updated });
}

/** Fallback por si la cuenta se configura para notificar por POST/JSON. */
export async function POST(req: Request) {
  if (!authorizeWebhookSecret(req, 'LABSMOBILE_WEBHOOK_SECRET')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const params = new URL(req.url).searchParams;
    let payload: Record<string, unknown> = {};
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      payload = (await req.json()) as Record<string, unknown>;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      payload = Object.fromEntries(await req.formData()) as Record<string, unknown>;
    }

    const pick = (key: string) =>
      (payload[key] !== undefined ? String(payload[key]) : params.get(key)) ?? null;

    const updated = await applyAck({
      subid: pick('subid'),
      msisdn: pick('msisdn'),
      status: pick('status'),
      desc: pick('desc'),
      acklevel: pick('acklevel'),
    });

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error webhook LabsMobile';
    console.error('[webhooks/labsmobile]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
