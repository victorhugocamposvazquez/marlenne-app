'use server';

import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { appOriginFromEnv } from '@/lib/app-origin';
import { publicLogoUrl } from '@/lib/salon-branding';
import { bookingPageUrl } from '@/lib/booking/urls';

export type MarketingBrand = {
  salonId: string;
  salonName: string;
  logoUrl: string | null;
  accent: string;
  bookingSlug: string | null;
  bookingUrl: string;
  origin: string;
};

export async function loadMarketingBrand(): Promise<MarketingBrand> {
  const me = await requireRole('admin');
  const sb = createClient();
  const { data, error } = await sb
    .from('salons')
    .select('id, name, logo_path, booking_slug, booking_accent')
    .eq('id', me.salon_id)
    .maybeSingle();

  let row = data as {
    id?: string;
    name?: string | null;
    logo_path?: string | null;
    booking_slug?: string | null;
    booking_accent?: string | null;
  } | null;

  if (error && /booking_accent/i.test(error.message)) {
    const retry = await sb
      .from('salons')
      .select('id, name, logo_path, booking_slug')
      .eq('id', me.salon_id)
      .maybeSingle();
    row = { ...(retry.data as object), booking_accent: null } as typeof row;
  }

  const origin = appOriginFromEnv();
  const bookingSlug = row?.booking_slug ?? null;
  const salonName = (row?.name ?? '').trim() || 'Tu centro';

  return {
    salonId: me.salon_id,
    salonName,
    logoUrl: publicLogoUrl(row?.logo_path ?? null),
    accent: (row?.booking_accent ?? '').trim() || '#D000A8',
    bookingSlug,
    bookingUrl: bookingSlug ? bookingPageUrl(origin, bookingSlug) : origin,
    origin,
  };
}
