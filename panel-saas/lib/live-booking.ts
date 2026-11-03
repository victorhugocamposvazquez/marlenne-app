import { panelAdmin } from '@/lib/supabase-admin';
import { loadLiveCenter } from '@/lib/live-center';

export type LiveBookingOption = { id: string; name: string; slug?: string | null };

export function slugifyBooking(raw: string): string {
  const s = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || 'item';
}

export function publicOptionSlug(o: LiveBookingOption): string {
  return (o.slug || slugifyBooking(o.name)).toLowerCase();
}

export type LiveSavedBookingLink = {
  id: string;
  link_key: string;
  label: string | null;
  custom_title: string | null;
  payment_mode: 'free' | 'pay_full' | 'pay_deposit';
  deposit_bps: number;
  active: boolean;
};

export type LiveBookingLinks = {
  salonId: string;
  salonName: string;
  slug: string | null;
  enabled: boolean;
  notifyEmail: string | null;
  accent: string | null;
  services: LiveBookingOption[];
  providers: LiveBookingOption[];
  savedLinks: LiveSavedBookingLink[];
};

/** Datos para generar enlaces/widgets de reserva del centro Live. */
export async function loadLiveBookingLinks(): Promise<LiveBookingLinks | null> {
  const live = await loadLiveCenter();
  if (!live) return null;
  const sb = panelAdmin();
  if (!sb) return null;

  const [salonRes, servicesRes, providersRes, linksRes] = await Promise.all([
    sb
      .from('salons')
      .select('booking_slug, booking_enabled, name, booking_notify_email, booking_accent')
      .eq('id', live.salonId)
      .maybeSingle(),
    sb
      .from('services')
      .select('id, name, booking_slug')
      .eq('salon_id', live.salonId)
      .eq('is_active', true)
      .eq('bookable_online', true)
      .order('sort_order')
      .order('name'),
    sb
      .from('staff')
      .select('id, full_name, booking_slug')
      .eq('salon_id', live.salonId)
      .eq('is_active', true)
      .eq('role', 'provider')
      .order('sort_order')
      .order('full_name'),
    sb
      .from('booking_links')
      .select('id, link_key, label, custom_title, payment_mode, deposit_bps, active')
      .eq('salon_id', live.salonId)
      .order('created_at', { ascending: false }),
  ]);

  if (salonRes.error) return null;
  const row = salonRes.data;

  const services = servicesRes.error
    ? []
    : (servicesRes.data ?? []).map(s => ({
        id: s.id as string,
        name: s.name as string,
        slug: ((s as { booking_slug?: string | null }).booking_slug) ?? null,
      }));
  const providers = providersRes.error
    ? []
    : (providersRes.data ?? []).map(p => ({
        id: p.id as string,
        name: p.full_name as string,
        slug: ((p as { booking_slug?: string | null }).booking_slug) ?? null,
      }));
  const savedLinks = linksRes.error
    ? []
    : ((linksRes.data ?? []) as LiveSavedBookingLink[]);

  return {
    salonId: live.salonId,
    salonName: (row?.name as string | undefined) ?? live.name,
    slug: (row?.booking_slug as string | null | undefined) ?? null,
    enabled: !!row?.booking_enabled,
    notifyEmail: (row as { booking_notify_email?: string | null } | null)?.booking_notify_email ?? null,
    accent: (row as { booking_accent?: string | null } | null)?.booking_accent ?? null,
    services,
    providers,
    savedLinks,
  };
}

type BookingPreset = {
  serviceId?: string | null;
  serviceSlug?: string | null;
  providerId?: string | null;
  providerSlug?: string | null;
  title?: string | null;
  linkKey?: string | null;
};

function bookingQuery(preset: BookingPreset): string {
  const q = new URLSearchParams();
  if (!preset.serviceSlug && preset.serviceId) q.set('service', preset.serviceId);
  if (preset.providerSlug) q.set('con', preset.providerSlug);
  else if (preset.providerId) q.set('provider', preset.providerId);
  const title = preset.title?.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (title) q.set('title', title);
  const s = q.toString();
  return s ? `?${s}` : '';
}

function withServicePath(base: string, preset: BookingPreset): string {
  if (preset.linkKey) return `${base}/l/${encodeURIComponent(preset.linkKey)}`;
  if (preset.serviceSlug) return `${base}/${encodeURIComponent(preset.serviceSlug)}`;
  return base;
}

export function buildBookingPageUrl(
  appOrigin: string,
  slug: string,
  preset: BookingPreset = {},
): string {
  const path = withServicePath(`${appOrigin.replace(/\/$/, '')}/r/${slug}`, preset);
  return `${path}${bookingQuery(preset)}`;
}

export function buildBookingEmbedUrl(
  appOrigin: string,
  slug: string,
  preset: BookingPreset = {},
): string {
  const path = withServicePath(`${appOrigin.replace(/\/$/, '')}/embed/${slug}`, preset);
  return `${path}${bookingQuery(preset)}`;
}

export function buildBookingIframe(embedUrl: string, title = 'Reservar cita'): string {
  return `<iframe src="${embedUrl}" title="${title}" style="width:100%;min-height:720px;border:0;border-radius:16px;" loading="lazy"></iframe>`;
}
