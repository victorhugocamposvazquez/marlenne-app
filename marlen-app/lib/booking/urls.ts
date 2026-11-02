/** Construye URLs de reserva (global o ads con preselección). Sin DOM ni next/*. */

export type BookingLinkPreset = {
  serviceId?: string | null;
  providerId?: string | null;
};

export function bookingQuery(preset: BookingLinkPreset = {}): string {
  const q = new URLSearchParams();
  if (preset.serviceId) q.set('service', preset.serviceId);
  if (preset.providerId) q.set('provider', preset.providerId);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function bookingPageUrl(origin: string, slug: string, preset: BookingLinkPreset = {}): string {
  return `${origin.replace(/\/$/, '')}/r/${slug}${bookingQuery(preset)}`;
}

export function bookingEmbedUrl(origin: string, slug: string, preset: BookingLinkPreset = {}): string {
  return `${origin.replace(/\/$/, '')}/embed/${slug}${bookingQuery(preset)}`;
}

export function bookingIframeCode(embedUrl: string, title = 'Reservar cita'): string {
  return `<iframe src="${embedUrl}" title="${title}" style="width:100%;min-height:720px;border:0;border-radius:16px;" loading="lazy"></iframe>`;
}

/** Lee service/provider de searchParams (también alias cortos s / con). */
export function parseBookingPreset(sp: {
  service?: string | string[];
  provider?: string | string[];
  s?: string | string[];
  con?: string | string[];
}): BookingLinkPreset {
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || null;
  return {
    serviceId: one(sp.service) ?? one(sp.s),
    providerId: one(sp.provider) ?? one(sp.con),
  };
}
