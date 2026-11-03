import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fulfillPaidBookingIntent } from '@/lib/booking/fulfill';
import { stripeClient, stripeWebhookSecret } from '@/lib/booking/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const stripe = stripeClient();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Stripe webhook no configurado' }, { status: 503 });
  }

  const raw = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Sin firma' }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Firma inválida' },
      { status: 400 },
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const intentId = session.metadata?.booking_intent_id;
    if (!intentId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const admin = createAdminClient();
    const { data: intent } = await admin
      .from('booking_intents')
      .select('id, salon_id')
      .eq('id', intentId)
      .maybeSingle();
    if (!intent) return NextResponse.json({ ok: true, missing: true });

    const { data: salon } = await admin
      .from('salons')
      .select('booking_slug')
      .eq('id', intent.salon_id)
      .maybeSingle();
    const slug = (salon?.booking_slug as string | null) ?? null;
    if (!slug) {
      return NextResponse.json({ error: 'Sin slug' }, { status: 500 });
    }

    const r = await fulfillPaidBookingIntent({
      intentId,
      bookingSlug: slug,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    });

    if (!r.ok) {
      console.error('[stripe booking webhook]', intentId, r.error);
      return NextResponse.json({ error: r.error }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
