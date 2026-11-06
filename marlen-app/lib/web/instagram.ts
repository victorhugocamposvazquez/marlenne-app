/** Instagram Graph API → últimas publicaciones (opcional). */

export type IgMedia = {
  id: string;
  mediaUrl: string;
  permalink: string;
  caption?: string;
  timestamp?: string;
};

/** Mosaico de formato cuando aún no hay fotos Graph (preview o web sin token). */
export function igLayoutPlaceholders(accent: string, href: string | null, count = 6): IgMedia[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ig-preview-${i}`,
    mediaUrl: `gradient:${i}:${accent}`,
    permalink: href || '#',
    caption: i === 0 ? 'Ver en Instagram' : undefined,
  }));
}

function parseUser(raw: string | null | undefined): string | null {
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

type GraphMedia = {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  media_type?: string;
};

function token(): string | null {
  return process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null;
}

function businessAccountId(): string | null {
  return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim() || null;
}

export function instagramConfigured(): boolean {
  return Boolean(token() && businessAccountId());
}

function mapMedia(rows: GraphMedia[] | undefined, limit: number): IgMedia[] {
  const out: IgMedia[] = [];
  for (const m of rows || []) {
    const mediaUrl =
      m.media_url ||
      (m.media_type === 'VIDEO' || m.media_type === 'REELS' ? m.thumbnail_url : undefined);
    if (!mediaUrl) continue;
    out.push({
      id: m.id,
      mediaUrl,
      permalink: m.permalink || `https://www.instagram.com/p/${m.id}/`,
      caption: m.caption,
      timestamp: m.timestamp,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Trae posts. Si pasas `username`, usa Business Discovery sobre ese @público
 * (el ID del env es tu cuenta Business con permiso de discovery).
 * Sin username, lista el media de la propia cuenta del token.
 */
export async function fetchInstagramMedia(
  limit = 9,
  opts?: { username?: string | null },
): Promise<
  | { ok: true; media: IgMedia[]; configured: true; username: string | null }
  | { ok: true; media: []; configured: false; hint: string; username: string | null }
  | { ok: false; error: string; configured: true; username: string | null }
> {
  const t = token();
  const myIgId = businessAccountId();
  const username = parseUser(opts?.username || '') || null;
  if (!t || !myIgId) {
    return {
      ok: true,
      media: [],
      configured: false,
      username,
      hint: 'Configura INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ACCOUNT_ID',
    };
  }

  const lim = Math.min(12, Math.max(1, limit));
  const mediaFields = 'id,caption,media_url,thumbnail_url,permalink,timestamp,media_type';

  let url: URL;
  if (username) {
    // username ya sanitizado (solo [a-z0-9._]); va literal en fields.
    url = new URL(`https://graph.facebook.com/v21.0/${myIgId}`);
    url.searchParams.set(
      'fields',
      `business_discovery.username(${username}){media.limit(${lim}){${mediaFields}}}`,
    );
    url.searchParams.set('access_token', t);
  } else {
    url = new URL(`https://graph.facebook.com/v21.0/${myIgId}/media`);
    url.searchParams.set('fields', mediaFields);
    url.searchParams.set('limit', String(lim));
    url.searchParams.set('access_token', t);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  const json = (await res.json()) as {
    data?: GraphMedia[];
    business_discovery?: { media?: { data?: GraphMedia[] } };
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      username,
      error: json.error?.message || `Instagram HTTP ${res.status}`,
    };
  }

  const rows = username ? json.business_discovery?.media?.data : json.data;
  const media = mapMedia(rows, lim);
  return { ok: true, configured: true, media, username };
}
