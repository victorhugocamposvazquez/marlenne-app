/** Instagram Graph API → últimas publicaciones (opcional). */

export type IgMedia = {
  id: string;
  mediaUrl: string;
  permalink: string;
  caption?: string;
  timestamp?: string;
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

/** Resuelve user → business account no es trivial sin token; usamos el ID fijo del env. */
export async function fetchInstagramMedia(limit = 6): Promise<
  | { ok: true; media: IgMedia[]; configured: true }
  | { ok: true; media: []; configured: false; hint: string }
  | { ok: false; error: string; configured: true }
> {
  const t = token();
  const igUser = businessAccountId();
  if (!t || !igUser) {
    return {
      ok: true,
      media: [],
      configured: false,
      hint: 'Configura INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ACCOUNT_ID',
    };
  }

  const url = new URL(`https://graph.facebook.com/v21.0/${igUser}/media`);
  url.searchParams.set('fields', 'id,caption,media_url,permalink,timestamp,media_type');
  url.searchParams.set('limit', String(Math.min(12, Math.max(1, limit))));
  url.searchParams.set('access_token', t);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const json = (await res.json()) as {
    data?: { id: string; caption?: string; media_url?: string; permalink?: string; timestamp?: string; media_type?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, configured: true, error: json.error?.message || `Instagram HTTP ${res.status}` };
  }

  const media: IgMedia[] = (json.data || [])
    .filter(m => m.media_url && (m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM' || !m.media_type))
    .slice(0, limit)
    .map(m => ({
      id: m.id,
      mediaUrl: m.media_url!,
      permalink: m.permalink || `https://www.instagram.com/p/${m.id}/`,
      caption: m.caption,
      timestamp: m.timestamp,
    }));

  return { ok: true, configured: true, media };
}
