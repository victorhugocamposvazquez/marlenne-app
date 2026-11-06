/** Convierte la URL pública /r/… en /embed/… para iframe y modal. */

import type { BookingThemeQuery } from '@/lib/booking/urls';
import { bookingQuery } from '@/lib/booking/urls';

export function bookingPageToEmbedUrl(pageUrl: string | null | undefined): string | null {
  const raw = (pageUrl || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    // Solo rutas de reserva del propio producto
    if (!u.pathname.startsWith('/r/') && !u.pathname.startsWith('/embed/')) return null;
    if (u.pathname.startsWith('/r/')) {
      u.pathname = u.pathname.replace(/^\/r\//, '/embed/');
    }
    return u.toString();
  } catch {
    if (raw.includes('/r/')) return raw.replace('/r/', '/embed/');
    if (raw.includes('/embed/')) return raw;
    return null;
  }
}

/** Añade (o sustituye) la gama de la web en la URL del widget. */
export function withBookingTheme(
  pageOrEmbedUrl: string | null | undefined,
  theme: BookingThemeQuery | null | undefined,
): string | null {
  const raw = (pageOrEmbedUrl || '').trim();
  if (!raw) return null;
  if (!theme?.accent && !theme?.bg && !theme?.card) return raw;
  try {
    const u = new URL(raw);
    for (const k of ['c', 'accent', 'ink', 'bg', 'card', 'muted', 'line'] as const) {
      u.searchParams.delete(k);
    }
    const q = bookingQuery({ theme }).replace(/^\?/, '');
    if (q) {
      for (const [k, v] of new URLSearchParams(q)) u.searchParams.set(k, v);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export function isBookingPageUrl(pageUrl: string | null | undefined): boolean {
  const raw = (pageUrl || '').trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.pathname.startsWith('/r/') || u.pathname.startsWith('/embed/');
  } catch {
    return raw.includes('/r/') || raw.includes('/embed/');
  }
}
