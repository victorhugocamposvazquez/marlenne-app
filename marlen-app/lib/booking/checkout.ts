import { createAdminClient } from '@/lib/supabase/admin';
import { chargeCentsForMode, stripeClient } from '@/lib/booking/stripe';
import type { BookingCheckoutRedirect, BookingFail, BookingLink } from '@/lib/booking/types';
import { FAIL as failShape } from '@/lib/booking/fail';

const FAIL = (code: string, message?: string): BookingFail => failShape(code, message);

const HOLD_MINUTES = 20;

export async function startPaidBookingCheckout(input: {
  slug: string;
  salonId: string;
  salonName: string;
  link: BookingLink;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  durationMin: number;
  startsAt: string;
  providerId?: string | null;
  fullName: string;
  phone: string;
  email?: string | null;
  note?: string | null;
  origin: string;
  embed?: boolean;
}): Promise<BookingCheckoutRedirect | BookingFail> {
  const stripe = stripeClient();
  if (!stripe) return FAIL('stripe', 'Pagos con tarjeta no están configurados');

  if (input.link.payment_mode === 'free') {
    return FAIL('mode', 'Este enlace no requiere pago');
  }

  const mode = input.link.payment_mode;
  const chargeCents = chargeCentsForMode(
    input.priceCents,
    mode,
    input.link.deposit_bps,
  );
  if (chargeCents < 50) return FAIL('amount', 'Importe demasiado bajo');

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();

  const { data: intent, error: insErr } = await admin
    .from('booking_intents')
    .insert({
      salon_id: input.salonId,
      booking_link_id: input.link.id,
      service_id: input.serviceId,
      provider_id: input.providerId ?? null,
      starts_at: input.startsAt,
      duration_min: input.durationMin,
      price_cents: input.priceCents,
      charge_cents: chargeCents,
      payment_mode: mode,
      full_name: input.fullName.trim(),
      phone: input.phone,
      email: input.email?.trim() || null,
      note: input.note?.trim() || null,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (insErr || !intent) {
    return FAIL('intent', insErr?.message ?? 'No se pudo iniciar el cobro');
  }

  const base = input.origin.replace(/\/$/, '');
  const returnPath = input.embed
    ? `/embed/${encodeURIComponent(input.slug)}/l/${encodeURIComponent(input.link.key)}`
    : `/r/${encodeURIComponent(input.slug)}/l/${encodeURIComponent(input.link.key)}`;
  const successUrl = `${base}${returnPath}?paid=1&intent=${intent.id}`;
  const cancelUrl = `${base}${returnPath}?paid=0&intent=${intent.id}`;

  const label =
    mode === 'pay_deposit'
      ? `Señal · ${input.serviceName} · ${input.salonName}`
      : `${input.serviceName} · ${input.salonName}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: input.email?.trim() || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: chargeCents,
            product_data: { name: label },
          },
        },
      ],
      metadata: {
        booking_intent_id: intent.id,
        salon_id: input.salonId,
        payment_mode: mode,
      },
    });

    if (!session.url) {
      await admin.from('booking_intents').update({ status: 'failed' }).eq('id', intent.id);
      return FAIL('stripe', 'Stripe no devolvió URL de pago');
    }

    await admin
      .from('booking_intents')
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', intent.id);

    return { ok: true, checkout: true, url: session.url, intentId: intent.id };
  } catch (e) {
    await admin.from('booking_intents').update({ status: 'failed' }).eq('id', intent.id);
    return FAIL('stripe', e instanceof Error ? e.message : 'Error Stripe');
  }
}
