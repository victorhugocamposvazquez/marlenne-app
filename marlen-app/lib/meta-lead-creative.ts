/** Creatividad del anuncio en Graph (Meta leads). */

import type { createAdminClient } from '@/lib/supabase/admin';
import type { createClient } from '@/lib/supabase/server';

type Db = ReturnType<typeof createAdminClient> | ReturnType<typeof createClient>;

const GRAPH = 'https://graph.facebook.com/v21.0';

const CREATIVE_FIELDS =
  'name,creative{id,thumbnail_url,image_url,title,body,effective_object_story_id,object_story_spec{link_data{picture},photo_data{url},video_data{image_url}},asset_feed_spec{images{url},videos{thumbnail_url}}}';

export type MetaAdCreative = {
  thumbnail_url: string | null;
  headline: string | null;
  body: string | null;
  ad_name: string | null;
};

type GraphCreative = {
  id?: string;
  thumbnail_url?: string;
  image_url?: string;
  title?: string;
  body?: string;
  effective_object_story_id?: string;
  object_story_spec?: {
    link_data?: { picture?: string };
    photo_data?: { url?: string };
    video_data?: { image_url?: string };
  };
  asset_feed_spec?: {
    images?: { url?: string }[];
    videos?: { thumbnail_url?: string }[];
  };
};

/** Píxeles que pide la URL de Facebook (`p64x64`, `s960x960`…). */
export function fbImagePixels(url: string | null | undefined): number | null {
  const m = url?.match(/(?:^|[^\d])[ps](\d{2,4})x(\d{2,4})(?:[^\d]|$)/i);
  if (!m) return null;
  return Math.max(Number(m[1]) || 0, Number(m[2]) || 0);
}

/**
 * La miniatura de Meta lleva `p64x64` en la URL del CDN.
 * El mismo archivo se puede pedir a 1080 si el parámetro existe.
 */
export function enlargeFbCdnUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  const px = fbImagePixels(raw);
  if (px != null && px >= 720) return raw;
  if (!/[ps]\d{2,4}x\d{2,4}/i.test(raw)) return raw;
  return raw.replace(/([ps])\d{2,4}x\d{2,4}/gi, '$11080x1080');
}

function creativeImageScore(url: string) {
  const px = fbImagePixels(url) ?? 0;
  let score = px * 10 + Math.min(url.length, 200);
  const low = url.toLowerCase();
  if (low.includes('thumbnail')) score -= 4000;
  if (px > 0 && px < 400) score -= 5000;
  return score;
}

/** Devuelve la URL más nítida que Meta da para la creatividad. */
export function pickBestCreativeImageUrl(creative: GraphCreative | null | undefined): string | null {
  if (!creative) return null;
  const spec = creative.object_story_spec;
  const candidates = [
    spec?.link_data?.picture,
    spec?.photo_data?.url,
    spec?.video_data?.image_url,
    ...(creative.asset_feed_spec?.images ?? []).map(image => image.url),
    creative.image_url,
    creative.thumbnail_url,
    ...(creative.asset_feed_spec?.videos ?? []).map(video => video.thumbnail_url),
  ];
  let best: string | null = null;
  let bestScore = -1;
  for (const raw of candidates) {
    const url = raw?.trim();
    if (!url) continue;
    const score = creativeImageScore(url);
    if (score > bestScore) {
      bestScore = score;
      best = url;
    }
  }
  return best;
}

export function isLikelyLowResAdImage(url: string | null | undefined) {
  const u = url?.trim();
  if (!u) return true;
  if (u.toLowerCase().includes('thumbnail')) return true;
  const px = fbImagePixels(u);
  if (px == null) return true;
  return px < 720;
}

async function graphJson<T>(id: string, token: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${GRAPH}/${encodeURIComponent(id)}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

function consider(bucket: { url: string; score: number }[], raw: string | null | undefined, bonus: number) {
  const url = raw?.trim();
  if (!url) return;
  bucket.push({ url, score: creativeImageScore(url) + bonus });
}

export async function fetchMetaAdCreative(adId: string, token: string): Promise<MetaAdCreative | null> {
  const basic = 'name,creative{id,thumbnail_url,image_url,title,body,effective_object_story_id}';
  const ad = await graphJson<{ name?: string; creative?: GraphCreative }>(adId, token, { fields: CREATIVE_FIELDS })
    ?? await graphJson<{ name?: string; creative?: GraphCreative }>(adId, token, { fields: basic });
  if (!ad) return null;
  const creative = ad.creative;
  const bucket: { url: string; score: number }[] = [];
  consider(bucket, pickBestCreativeImageUrl(creative), 0);

  const extra: Promise<void>[] = [];
  if (creative?.id) {
    extra.push(graphJson<{ thumbnail_url?: string }>(creative.id, token, {
      fields: 'thumbnail_url',
      thumbnail_width: '1080',
      thumbnail_height: '1080',
    }).then(big => { consider(bucket, big?.thumbnail_url, 3000); }));
  }
  if (creative?.effective_object_story_id) {
    extra.push(graphJson<{ full_picture?: string }>(creative.effective_object_story_id, token, {
      fields: 'full_picture',
    }).then(post => { consider(bucket, post?.full_picture, 8000); }));
  }
  await Promise.all(extra);

  let best: string | null = null;
  let bestScore = -1;
  for (const item of bucket) {
    if (item.score > bestScore) {
      bestScore = item.score;
      best = item.url;
    }
  }
  return {
    thumbnail_url: best,
    headline: creative?.title || null,
    body: creative?.body || null,
    ad_name: ad.name?.trim() || null,
  };
}

export async function upsertMetaAdRow(
  sb: Db,
  input: {
    salonId: string;
    campaignId: string | null;
    campaignName: string | null;
    adId: string;
    adName: string | null;
    creative: MetaAdCreative;
  },
) {
  const row = {
    salon_id: input.salonId,
    campaign_id: input.campaignId,
    campaign_name: input.campaignName,
    ad_id: input.adId,
    ad_name: input.adName || input.creative.ad_name,
    thumbnail_url: input.creative.thumbnail_url,
    headline: input.creative.headline,
    body: input.creative.body,
  };
  const { data: existing, error: readError } = await sb
    .from('meta_ads')
    .select('id')
    .eq('salon_id', input.salonId)
    .eq('ad_id', input.adId)
    .maybeSingle();
  if (readError) return;
  if (existing?.id) {
    await sb.from('meta_ads').update(row).eq('id', existing.id);
    return;
  }
  await sb.from('meta_ads').insert(row);
}

export async function enrichLeadsAdCreative(
  sb: Db,
  salonId: string,
  adId: string,
  token: string,
  meta: { campaignId: string | null; campaignName: string | null; adName: string | null },
) {
  const creative = await fetchMetaAdCreative(adId, token);
  if (!creative) return;
  await upsertMetaAdRow(sb, {
    salonId,
    campaignId: meta.campaignId,
    campaignName: meta.campaignName,
    adId,
    adName: meta.adName,
    creative,
  });
  await sb
    .from('leads')
    .update({
      thumbnail_url: creative.thumbnail_url,
      ad_headline: creative.headline,
      ad_body: creative.body,
    })
    .eq('salon_id', salonId)
    .eq('ad_id', adId);
}

/** Al abrir la ficha: si solo hay miniatura, vuelve a pedir la imagen grande. */
export async function refreshLeadAdImage(
  admin: Db,
  salonId: string,
  input: {
    leadId: string;
    adId: string;
    thumbnailUrl: string | null;
    campaignId: string | null;
    campaignName: string | null;
    adName: string | null;
  },
): Promise<string | null> {
  if (!isLikelyLowResAdImage(input.thumbnailUrl) && input.thumbnailUrl?.trim()) {
    return input.thumbnailUrl;
  }
  const { data: conn } = await admin
    .from('meta_connections')
    .select('page_access_token')
    .eq('salon_id', salonId)
    .maybeSingle();
  const token = (conn?.page_access_token as string | undefined)?.trim();
  if (!token) return input.thumbnailUrl;
  const creative = await fetchMetaAdCreative(input.adId, token);
  if (!creative) return input.thumbnailUrl;
  const next = creative.thumbnail_url?.trim() || null;
  if (!next || next === input.thumbnailUrl) return input.thumbnailUrl;
  if (creativeImageScore(next) <= creativeImageScore(input.thumbnailUrl || '')) {
    return input.thumbnailUrl;
  }
  await upsertMetaAdRow(admin, {
    salonId,
    campaignId: input.campaignId,
    campaignName: input.campaignName,
    adId: input.adId,
    adName: input.adName,
    creative,
  });
  await admin
    .from('leads')
    .update({
      thumbnail_url: next,
      ad_headline: creative.headline,
      ad_body: creative.body,
    })
    .eq('id', input.leadId);
  return next;
}