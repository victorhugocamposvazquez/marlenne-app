/** Normaliza enlaces de Google / Instagram para la web del centro. */

export function parseInstagramUser(raw: string | null | undefined): string | null {
  const v = (raw || '').trim();
  if (!v) return null;
  const u = v
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .trim();
  if (!/^[a-z0-9._]{2,30}$/i.test(u)) return null;
  return u;
}

export function instagramProfileUrl(raw: string | null | undefined): string | null {
  const u = parseInstagramUser(raw);
  return u ? `https://www.instagram.com/${u}/` : null;
}

export function isGooglePlaceUrl(raw: string | null | undefined): boolean {
  const v = (raw || '').trim();
  if (!v) return false;
  return /(google\.|g\.page|goo\.gl|maps\.app)/i.test(v);
}

/** URL usable para abrir la ficha / reseñas en Google. */
export function googlePlaceUrl(raw: string | null | undefined): string | null {
  const v = (raw || '').trim();
  if (!v || !isGooglePlaceUrl(v)) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

/**
 * Embed de Maps sin API key. Funciona mejor con enlaces maps/g.page;
 * si el navegador bloquea el iframe, la sección sigue teniendo el botón a Google.
 */
export function googleMapsEmbedUrl(raw: string | null | undefined, address?: string | null): string | null {
  const place = googlePlaceUrl(raw);
  const q = place || (address || '').trim();
  if (!q) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
}
