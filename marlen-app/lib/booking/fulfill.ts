import { createAdminClient } from '@/lib/supabase/admin';
import { createPublicBooking } from '@/lib/booking/server';

type IntentRow = {
  id: string;
  salon_id: string;
  booking_link_id: string | null;
  service_id: string;
  provider_id: string | null;
  starts_at: string;
  duration_min: number;
  price_cents: number;
  charge_cents: number;
  payment_mode: 'pay_full' | 'pay_deposit';
  full_name: string;
  phone: string;
  email: string | null;
  note: string | null;
  status: string;
  appointment_id: string | null;
  expires_at: string;
};

/** Confirma intent pagado → cita + ledger. Idempotente. */
export async function fulfillPaidBookingIntent(input: {
  intentId: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  bookingSlug: string;
}): Promise<{ ok: true; appointmentId: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: intent, error } = await admin
    .from('booking_intents')
    .select('*')
    .eq('id', input.intentId)
    .maybeSingle();

  if (error || !intent) return { ok: false, error: error?.message ?? 'Intent no encontrado' };
  const row = intent as IntentRow;

  if (row.status === 'paid' && row.appointment_id) {
    return { ok: true, appointmentId: row.appointment_id };
  }
  if (row.status !== 'pending' && row.status !== 'paid') {
    return { ok: false, error: `Intent en estado ${row.status}` };
  }
  if (new Date(row.expires_at).getTime() < Date.now() - 60_000 && row.status === 'pending') {
    await admin.from('booking_intents').update({ status: 'expired' }).eq('id', row.id);
    return { ok: false, error: 'La reserva ha caducado' };
  }

  const created = await createPublicBooking({
    slug: input.bookingSlug,
    serviceId: row.service_id,
    startsAt: row.starts_at,
    providerId: row.provider_id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email ?? undefined,
    note: row.note ?? undefined,
  });

  if (!created.ok) {
    return { ok: false, error: created.message ?? created.code };
  }

  const paidCents = row.charge_cents;
  const now = new Date().toISOString();
  await admin
    .from('appointments')
    .update({
      paid_cents: paidCents,
      payment_method: 'card',
      booking_link_id: row.booking_link_id,
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      updated_at: now,
    })
    .eq('id', created.id);

  await admin
    .from('booking_intents')
    .update({
      status: 'paid',
      appointment_id: created.id,
      stripe_checkout_session_id:
        input.stripeCheckoutSessionId ?? undefined,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? undefined,
      updated_at: now,
    })
    .eq('id', row.id);

  await admin.from('salon_booking_ledger').insert({
    salon_id: row.salon_id,
    appointment_id: created.id,
    booking_intent_id: row.id,
    amount_cents: paidCents,
    currency: 'eur',
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    status: 'pending',
  });

  return { ok: true, appointmentId: created.id };
}
