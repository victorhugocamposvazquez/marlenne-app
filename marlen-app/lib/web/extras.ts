/** Normaliza enlaces de Google / Instagram para la web del centro. */

const IG_RESERVED = new Set([
  'p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts',
  'about', 'legal', 'directory', 'direct', 'share',
]);

function validIgUser(raw: string): string | null {
  const s = raw.replace(/^@+/, '').trim();
  if (!/^[a-z0-9._]{1,30}$/i.test(s)) return null;
  if (!/[a-z0-9]/i.test(s)) return null;
  return s;
}

/** Acepta usuario, @usuario o URL del perfil (con o sin https). */
export function parseInstagramUser(raw: string | null | undefined): string | null {
  let v = (raw || '').trim();
  if (!v) return null;
  v = v.replace(/^@+/, '');

  const looksUrl = /^(https?:\/\/)?((www|m|l)\.)?(instagram\.com|instagr\.am)\//i.test(v);
  if (!looksUrl) return validIgUser(v.split(/[/?#\s]/)[0] || '');

  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|l)\./, '');
  if (host !== 'instagram.com' && host !== 'instagr.am') return null;
  const parts = url.pathname.split('/').filter(Boolean).map(p => decodeURIComponent(p));
  if (!parts.length) return null;
  const first = parts[0].toLowerCase();
  if (first === 'stories' && parts[1]) return validIgUser(parts[1]);
  if (IG_RESERVED.has(first)) return null;
  return validIgUser(parts[0]);
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
