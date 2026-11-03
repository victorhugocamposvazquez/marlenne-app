import Stripe from 'stripe';

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

export function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_BOOKING_WEBHOOK_SECRET?.trim() || null;
}

export function chargeCentsForMode(
  priceCents: number,
  mode: 'pay_full' | 'pay_deposit',
  depositBps: number,
): number {
  if (mode === 'pay_full') return Math.max(0, priceCents);
  const bps = Math.min(10000, Math.max(500, depositBps));
  return Math.max(50, Math.round((priceCents * bps) / 10000));
}
