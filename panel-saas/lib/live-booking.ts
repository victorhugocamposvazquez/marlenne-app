import { panelAdmin } from '@/lib/supabase-admin';
import { loadLiveCenter } from '@/lib/live-center';

export type LiveBookingOption = { id: string; name: string };

export type LiveBookingLinks = {
  salonId: string;
  salonName: string;
  slug: string | null;
  enabled: boolean;
  services: LiveBookingOption[];
  providers: LiveBookingOption[];
};

/** Datos para generar enlaces/widgets de reserva del centro Live. */
export async function loadLiveBookingLinks(): Promise<LiveBookingLinks | null> {
  const live = await loadLiveCenter();
  if (!live) return null;
  const sb = panelAdmin();
  if (!sb) return null;

  const [salonRes, servicesRes, providersRes] = await Promise.all([
    sb
      .from('salons')
      .select('booking_slug, booking_enabled, name')
      .eq('id', live.salonId)
      .maybeSingle(),
    sb
      .from('services')
      .select('id, name')
      .eq('salon_id', live.salonId)
      .eq('is_active', true)
      .eq('bookable_online', true)
      .order('sort_order')
      .order('name'),
    sb
      .from('staff')
      .select('id, full_name')
      .eq('salon_id', live.salonId)
      .eq('is_active', true)
      .eq('role', 'provider')
      .order('sort_order')
      .order('full_name'),
  ]);

  if (salonRes.error) return null;
  const row = salonRes.data;

  return {
    salonId: live.salonId,
    salonName: (row?.name as string | undefined) ?? live.name,
    slug: (row?.booking_slug as string | null | undefined) ?? null,
    enabled: !!row?.booking_enabled,
    services: (servicesRes.data ?? []).map(s => ({
      id: s.id as string,
      name: s.name as string,
    })),
    providers: (providersRes.data ?? []).map(p => ({
      id: p.id as string,
      name: p.full_name as string,
    })),
  };
}

type BookingPreset = {
  serviceId?: string | null;
  providerId?: string | null;
  title?: string | null;
};

function bookingQuery(preset: BookingPreset): string {
  const q = new URLSearchParams();
  if (preset.serviceId) q.set('service', preset.serviceId);
  if (preset.providerId) q.set('provider', preset.providerId);
  const title = preset.title?.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (title) q.set('title', title);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function buildBookingPageUrl(
  appOrigin: string,
  slug: string,
  preset: BookingPreset = {},
): string {
  return `${appOrigin.replace(/\/$/, '')}/r/${slug}${bookingQuery(preset)}`;
}

export function buildBookingEmbedUrl(
  appOrigin: string,
  slug: string,
  preset: BookingPreset = {},
): string {
  return `${appOrigin.replace(/\/$/, '')}/embed/${slug}${bookingQuery(preset)}`;
}

export function buildBookingIframe(embedUrl: string, title = 'Reservar cita'): string {
  return `<iframe src="${embedUrl}" title="${title}" style="width:100%;min-height:720px;border:0;border-radius:16px;" loading="lazy"></iframe>`;
}
