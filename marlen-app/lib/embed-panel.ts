import type { CookieOptions } from '@supabase/ssr';

export const EMBED_PANEL_STORAGE = 'marlenne_embed_panel';

/** Entrada ops embebida en el panel (iframe cross-site). */
export function isEmbedPanelRequest(req: Request): boolean {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get('embed') === '1') return true;
  } catch {
    /* ignore */
  }
  if (req.headers.get('sec-fetch-dest') === 'iframe') return true;
  return false;
}

export function embedPanelCookieOptions(): Pick<CookieOptions, 'sameSite' | 'secure' | 'path'> {
  return {
    path: '/',
    secure: true,
    sameSite: 'none',
  };
}

export function opsContextCookieOptions(embed: boolean): CookieOptions {
  const secure = process.env.NODE_ENV === 'production';
  if (embed) {
    return { httpOnly: true, secure: true, sameSite: 'none', path: '/' };
  }
  return { httpOnly: true, secure, sameSite: 'lax', path: '/' };
}
