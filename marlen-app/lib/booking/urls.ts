/** Construye URLs de reserva (global o ads con preselección). Sin DOM ni next/*. */

export type BookingLinkPreset = {
  serviceId?: string | null;
  providerId?: string | null;
  /** Título visible del widget (embudo / ads). */
  title?: string | null;
};

const TITLE_MAX = 80;

export function sanitizeBookingTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TITLE_MAX);
  return cleaned || null;
}

export function bookingQuery(preset: BookingLinkPreset = {}): string {
  const q = new URLSearchParams();
  if (preset.serviceId) q.set('service', preset.serviceId);
  if (preset.providerId) q.set('provider', preset.providerId);
  const title = sanitizeBookingTitle(preset.title);
  if (title) q.set('title', title);
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
  const safeTitle = title.replace(/"/g, '&quot;');
  return `<iframe src="${embedUrl}" title="${safeTitle}" style="width:100%;min-height:720px;border:0;border-radius:16px;" loading="lazy"></iframe>`;
}

/** Lee service/provider/title de searchParams (también alias cortos s / con / t). */
export function parseBookingPreset(sp: {
  service?: string | string[];
  provider?: string | string[];
  title?: string | string[];
  s?: string | string[];
  con?: string | string[];
  t?: string | string[];
}): BookingLinkPreset {
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || null;
  return {
    serviceId: one(sp.service) ?? one(sp.s),
    providerId: one(sp.provider) ?? one(sp.con),
    title: sanitizeBookingTitle(one(sp.title) ?? one(sp.t)),
  };
}
