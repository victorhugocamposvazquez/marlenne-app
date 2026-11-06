/** Convierte la URL pública /r/… en /embed/… para iframe y modal. */

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
