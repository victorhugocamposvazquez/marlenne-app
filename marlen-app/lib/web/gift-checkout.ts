import { createAdminClient } from '@/lib/supabase/admin';
import { stripeClient } from '@/lib/booking/stripe';
import { parseSiteConfig } from '@/lib/web/site-config';
import { normalizeSiteSlug } from '@/lib/web/site-urls';

const DEFAULT_AMOUNTS_EUR = [30, 50, 100];

function giftCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'ML-';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function giftAmountsFromConfig(config: { giftAmounts?: number[] } | null | undefined): number[] {
  const raw = config?.giftAmounts;
  if (Array.isArray(raw) && raw.length) {
    return raw.map(n => Math.round(Number(n))).filter(n => n >= 5 && n <= 500).slice(0, 6);
  }
  return DEFAULT_AMOUNTS_EUR;
}

export async function startGiftCheckout(input: {
  slug: string;
  amountEur: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  recipientName?: string | null;
  message?: string | null;
  origin: string;
}): Promise<{ ok: true; url: string; orderId: string } | { ok: false; error: string }> {
  const stripe = stripeClient();
  if (!stripe) return { ok: false, error: 'Pagos con tarjeta no están configurados' };

  const amountEur = Math.round(Number(input.amountEur));
  if (!Number.isFinite(amountEur) || amountEur < 5 || amountEur > 500) {
    return { ok: false, error: 'Elige un importe entre 5 € y 500 €' };
  }
  const amountCents = amountEur * 100;

  const name = input.buyerName.trim();
  const email = input.buyerEmail.trim().toLowerCase();
  if (name.length < 2) return { ok: false, error: 'Indica tu nombre' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Email no válido' };

  const admin = createAdminClient();
  const slug = normalizeSiteSlug(input.slug);
  const { data: siteRow } = await admin
    .from('salon_sites')
    .select('salon_id, slug, config, published_at')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .maybeSingle();
  if (!siteRow) return { ok: false, error: 'Web no publicada' };

  const config = parseSiteConfig(siteRow.config);
  if (!config.fx.gift) return { ok: false, error: 'Tarjetas regalo no activadas' };

  const allowed = giftAmountsFromConfig(config);
  if (!allowed.includes(amountEur)) {
    return { ok: false, error: 'Ese importe no está disponible' };
  }

  const { data: salon } = await admin
    .from('salons')
    .select('id, name')
    .eq('id', siteRow.salon_id)
    .maybeSingle();
  if (!salon) return { ok: false, error: 'Centro no encontrado' };

  const code = giftCode();
  const { data: order, error: insErr } = await admin
    .from('gift_orders')
    .insert({
      salon_id: siteRow.salon_id,
      amount_cents: amountCents,
      code,
      buyer_name: name,
      buyer_email: email,
      buyer_phone: input.buyerPhone?.trim() || null,
      recipient_name: input.recipientName?.trim() || null,
      message: input.message?.trim() || null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insErr || !order) {
    return { ok: false, error: insErr?.message || 'No se pudo crear el pedido' };
  }

  const base = input.origin.replace(/\/$/, '');
  const returnBase = `${base}/s/${encodeURIComponent(siteRow.slug)}`;
  const successUrl = `${returnBase}?gift=1&order=${order.id}`;
  const cancelUrl = `${returnBase}?gift=0&order=${order.id}#regalo`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: amountCents,
            product_data: {
              name: `Tarjeta regalo ${amountEur} € · ${salon.name}`,
              description: input.recipientName?.trim()
                ? `Para ${input.recipientName.trim()}`
                : 'Canjeable en el centro',
            },
          },
        },
      ],
      metadata: {
        kind: 'gift',
        gift_order_id: order.id,
        salon_id: siteRow.salon_id as string,
      },
    });

    if (!session.url) {
      await admin.from('gift_orders').update({ status: 'failed' }).eq('id', order.id);
      return { ok: false, error: 'Stripe no devolvió URL de pago' };
    }

    await admin
      .from('gift_orders')
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return { ok: true, url: session.url, orderId: order.id };
  } catch (e) {
    await admin.from('gift_orders').update({ status: 'failed' }).eq('id', order.id);
    return { ok: false, error: e instanceof Error ? e.message : 'Error Stripe' };
  }
}

export async function fulfillGiftOrder(input: {
  orderId: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('gift_orders')
    .select('id, status')
    .eq('id', input.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: 'Pedido no encontrado' };
  if (order.status === 'paid') return { ok: true };

  const { error } = await admin
    .from('gift_orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? undefined,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.orderId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
