/** Últimas publicaciones de un perfil (solo lectura; Marlén no publica). */

import https from 'node:https';
import { parseInstagramUser } from '@/lib/web/extras';

export type IgMedia = {
  id: string;
  mediaUrl: string;
  permalink: string;
  caption?: string;
  timestamp?: string;
};

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

/** Fotos que vienen en el HTML del embed público (escapadas). */
export function mediaFromInstagramEmbedHtml(html: string, limit = 9): IgMedia[] {
  const unescape = (s: string) => {
    let prev = '';
    let cur = s;
    while (cur !== prev) {
      prev = cur;
      cur = cur.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
    }
    return cur;
  };
  const out: IgMedia[] = [];
  const codeRe = /shortcode\\":\\"([A-Za-z0-9_-]+)\\"/g;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(html)) && out.length < limit) {
    const code = m[1];
    const window = html.slice(m.index, m.index + 5000);
    const url = /display_url\\":\\"(https:.+?)\\"/.exec(window);
    if (!url) continue;
    const mediaUrl = unescape(url[1]);
    if (!/^https:\/\/[^/]*cdninstagram\.com\//i.test(mediaUrl)) continue;
    out.push({
      id: code,
      mediaUrl,
      permalink: `https://www.instagram.com/p/${code}/`,
    });
  }
  return out;
}

function getEmbedHtml(username: string): Promise<string> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9',
    Referer: 'https://www.instagram.com/',
    'Sec-Fetch-Dest': 'iframe',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
  };
  const read = (hostname: string, path: string, hops: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const req = https.get({ hostname, path, headers }, (res) => {
        const loc = res.headers.location;
        if (loc && res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && hops < 3) {
          res.resume();
          try {
            const next = new URL(loc, `https://${hostname}`);
            resolve(read(next.hostname, `${next.pathname}${next.search}`, hops + 1));
          } catch (err) {
            reject(err);
          }
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
      req.on('error', reject);
      req.setTimeout(8000, () => req.destroy(new Error('instagram embed timeout')));
    });
  return read('www.instagram.com', `/${encodeURIComponent(username)}/embed/`, 0);
}

async function fetchEmbedMedia(username: string, limit: number): Promise<IgMedia[]> {
  try {
    const html = await getEmbedHtml(username);
    return mediaFromInstagramEmbedHtml(html, limit);
  } catch {
    return [];
  }
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
 * Trae las últimas fotos de un @ (solo lectura). Primero el embed público
 * del perfil; si no hay fotos y hay token, Business Discovery.
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
  const username = parseInstagramUser(opts?.username || '') || null;
  const lim = Math.min(12, Math.max(1, limit));

  if (username) {
    const fromEmbed = await fetchEmbedMedia(username, lim);
    if (fromEmbed.length) {
      return { ok: true, configured: true, media: fromEmbed, username };
    }
  }

  if (!t || !myIgId) {
    return {
      ok: true,
      media: [],
      configured: false,
      username,
      hint: 'Instagram no ha devuelto fotos de ese perfil',
    };
  }

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
