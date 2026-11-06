/** Convierte la URL pública /r/… en /embed/… para iframe y modal. */

import type { BookingThemeQuery } from '@/lib/booking/urls';
import { bookingQuery } from '@/lib/booking/urls';

const BASE = 'http://booking.local';

/** Path+query relativo: el iframe usa el mismo host que la web (Vercel, localhost o app.marlenapp.com). */
export function toSameOriginEmbedSrc(pageOrEmbedUrl: string | null | undefined): string | null {
  const raw = (pageOrEmbedUrl || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw, BASE);
    if (!u.pathname.startsWith('/r/') && !u.pathname.startsWith('/embed/')) return null;
    if (u.pathname.startsWith('/r/')) {
      u.pathname = u.pathname.replace(/^\/r\//, '/embed/');
    }
    return `${u.pathname}${u.search}`;
  } catch {
    if (raw.startsWith('/embed/')) return raw;
    if (raw.startsWith('/r/')) return raw.replace(/^\/r\//, '/embed/');
    return null;
  }
}

export function bookingPageToEmbedUrl(pageUrl: string | null | undefined): string | null {
  return toSameOriginEmbedSrc(pageUrl);
}

/** Añade (o sustituye) la gama de la web en la URL del widget. */
export function withBookingTheme(
  pageOrEmbedUrl: string | null | undefined,
  theme: BookingThemeQuery | null | undefined,
): string | null {
  const src = toSameOriginEmbedSrc(pageOrEmbedUrl);
  if (!src) return null;
  if (!theme?.accent && !theme?.bg && !theme?.card) return src;
  try {
    const u = new URL(src, BASE);
    for (const k of ['c', 'accent', 'ink', 'bg', 'card', 'muted', 'line'] as const) {
      u.searchParams.delete(k);
    }
    const q = bookingQuery({ theme }).replace(/^\?/, '');
    if (q) {
      for (const [k, v] of new URLSearchParams(q)) u.searchParams.set(k, v);
    }
    return `${u.pathname}${u.search}`;
  } catch {
    return src;
  }
}

/**
 * Limita el catálogo del embed a estos IDs (toggle «Reserva online» de la web).
 * Pasa siempre un array cuando la web controla el listado; así el preview
 * refleja el toggle al instante, sin esperar a guardar en BD.
 */
export function withBookingOnlyServices(
  pageOrEmbedUrl: string | null | undefined,
  serviceIds: string[],
): string | null {
  const src = toSameOriginEmbedSrc(pageOrEmbedUrl);
  if (!src) return null;
  try {
    const u = new URL(src, BASE);
    const q = bookingQuery({ onlyServiceIds: serviceIds }).replace(/^\?/, '');
    u.searchParams.delete('only');
    if (q) {
      for (const [k, v] of new URLSearchParams(q)) u.searchParams.set(k, v);
    }
    return `${u.pathname}${u.search}`;
  } catch {
    return src;
  }
}

export function isBookingPageUrl(pageUrl: string | null | undefined): boolean {
  const raw = (pageUrl || '').trim();
  if (!raw) return false;
  try {
    const u = new URL(raw, BASE);
    return u.pathname.startsWith('/r/') || u.pathname.startsWith('/embed/');
  } catch {
    return raw.includes('/r/') || raw.includes('/embed/');
  }
}
