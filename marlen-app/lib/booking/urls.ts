/** Construye URLs de reserva (global o ads con preselección). Sin DOM ni next/*. */

export type BookingThemeQuery = {
  accent?: string | null;
  ink?: string | null;
  bg?: string | null;
  card?: string | null;
  muted?: string | null;
  line?: string | null;
};

export type BookingLinkPreset = {
  /** Preferir serviceSlug en URLs públicas; serviceId queda por compat. */
  serviceId?: string | null;
  serviceSlug?: string | null;
  providerId?: string | null;
  providerSlug?: string | null;
  /** Título visible del widget (embudo / ads). */
  title?: string | null;
  /** Clave de booking_links (/r/{slug}/l/{linkKey}). */
  linkKey?: string | null;
  /** Gama de la web del centro (override del widget embebido). */
  theme?: BookingThemeQuery | null;
  /**
   * IDs permitidos desde la web (toggle «Reserva online»).
   * Si es array (aunque vacío), el widget filtra a esa lista.
   * `null`/`undefined` = no filtrar (catálogo bookable_online completo).
   */
  onlyServiceIds?: string[] | null;
};

const TITLE_MAX = 80;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeBookingTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TITLE_MAX);
  return cleaned || null;
}

/** Slug URL-friendly (cavitación → cavitacion). */
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

export function isBookingUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function hexParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^#/, '').toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(s)) return null;
  return s;
}

export function bookingQuery(preset: BookingLinkPreset = {}): string {
  const q = new URLSearchParams();
  // Servicio va en el path cuando hay slug; solo query si llega UUID legacy.
  if (!preset.serviceSlug && preset.serviceId) q.set('service', preset.serviceId);
  if (preset.providerSlug) q.set('con', preset.providerSlug);
  else if (preset.providerId) q.set('provider', preset.providerId);
  const title = sanitizeBookingTitle(preset.title);
  if (title) q.set('title', title);
  if (preset.onlyServiceIds) {
    const ids = preset.onlyServiceIds.filter(isBookingUuid);
    q.set('only', ids.length ? ids.join(',') : 'none');
  }
  const th = preset.theme;
  if (th) {
    const accent = hexParam(th.accent);
    const ink = hexParam(th.ink);
    const bg = hexParam(th.bg);
    const card = hexParam(th.card);
    const muted = hexParam(th.muted);
    const line = hexParam(th.line);
    if (accent) q.set('c', accent);
    if (ink) q.set('ink', ink);
    if (bg) q.set('bg', bg);
    if (card) q.set('card', card);
    if (muted) q.set('muted', muted);
    if (line) q.set('line', line);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

function bookingPath(salonSlug: string, preset: BookingLinkPreset = {}): string {
  const base = `/r/${salonSlug}`;
  if (preset.linkKey) return `${base}/l/${encodeURIComponent(preset.linkKey)}`;
  if (preset.serviceSlug) return `${base}/${encodeURIComponent(preset.serviceSlug)}`;
  return base;
}

function embedPath(salonSlug: string, preset: BookingLinkPreset = {}): string {
  const base = `/embed/${salonSlug}`;
  if (preset.linkKey) return `${base}/l/${encodeURIComponent(preset.linkKey)}`;
  if (preset.serviceSlug) return `${base}/${encodeURIComponent(preset.serviceSlug)}`;
  return base;
}

export function bookingPageUrl(origin: string, salonSlug: string, preset: BookingLinkPreset = {}): string {
  return `${origin.replace(/\/$/, '')}${bookingPath(salonSlug, preset)}${bookingQuery(preset)}`;
}

export function bookingEmbedUrl(origin: string, salonSlug: string, preset: BookingLinkPreset = {}): string {
  return `${origin.replace(/\/$/, '')}${embedPath(salonSlug, preset)}${bookingQuery(preset)}`;
}

export function bookingIframeCode(embedUrl: string, title = 'Reservar cita'): string {
  const safeTitle = title.replace(/"/g, '&quot;');
  return `<iframe src="${embedUrl}" title="${safeTitle}" style="width:100%;min-height:720px;border:0;border-radius:16px;" loading="lazy"></iframe>`;
}

/** Lee service/provider/title/tema de searchParams (también alias cortos). */
export function parseBookingPreset(sp: {
  service?: string | string[];
  provider?: string | string[];
  title?: string | string[];
  s?: string | string[];
  con?: string | string[];
  t?: string | string[];
  c?: string | string[];
  accent?: string | string[];
  ink?: string | string[];
  bg?: string | string[];
  card?: string | string[];
  muted?: string | string[];
  line?: string | string[];
  only?: string | string[];
}): BookingLinkPreset {
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || null;
  const serviceKey = one(sp.service) ?? one(sp.s);
  const providerKey = one(sp.provider) ?? one(sp.con);
  const toHex = (v: string | null) => {
    const h = hexParam(v);
    return h ? `#${h}` : null;
  };
  const accent = toHex(one(sp.c) ?? one(sp.accent));
  const ink = toHex(one(sp.ink));
  const bg = toHex(one(sp.bg));
  const card = toHex(one(sp.card));
  const muted = toHex(one(sp.muted));
  const line = toHex(one(sp.line));
  const theme =
    accent || ink || bg || card || muted || line
      ? { accent, ink, bg, card, muted, line }
      : null;
  const onlyRaw = one(sp.only);
  let onlyServiceIds: string[] | null = null;
  if (onlyRaw != null) {
    if (!onlyRaw || onlyRaw === 'none') onlyServiceIds = [];
    else onlyServiceIds = onlyRaw.split(',').map(s => s.trim()).filter(isBookingUuid);
  }
  return {
    serviceId: serviceKey && isBookingUuid(serviceKey) ? serviceKey : null,
    serviceSlug: serviceKey && !isBookingUuid(serviceKey) ? serviceKey.toLowerCase() : null,
    providerId: providerKey && isBookingUuid(providerKey) ? providerKey : null,
    providerSlug: providerKey && !isBookingUuid(providerKey) ? providerKey.toLowerCase() : null,
    title: sanitizeBookingTitle(one(sp.title) ?? one(sp.t)),
    theme,
    onlyServiceIds,
  };
}
