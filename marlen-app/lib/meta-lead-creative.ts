/** Creatividad del anuncio en Graph (Meta leads). */

import type { createAdminClient } from '@/lib/supabase/admin';
import type { createClient } from '@/lib/supabase/server';

type Db = ReturnType<typeof createAdminClient> | ReturnType<typeof createClient>;

const GRAPH = 'https://graph.facebook.com/v21.0';

const CREATIVE_FIELDS =
  'name,creative{thumbnail_url,image_url,title,body,object_story_spec{link_data{picture},photo_data{url},video_data{image_url}}}';

export type MetaAdCreative = {
  thumbnail_url: string | null;
  headline: string | null;
  body: string | null;
  ad_name: string | null;
};

type GraphCreative = {
  thumbnail_url?: string;
  image_url?: string;
  title?: string;
  body?: string;
  object_story_spec?: {
    link_data?: { picture?: string };
    photo_data?: { url?: string };
    video_data?: { image_url?: string };
  };
};

/** Devuelve la URL más nítida que Meta da para la creatividad. */
export function pickBestCreativeImageUrl(creative: GraphCreative | null | undefined): string | null {
  if (!creative) return null;
  const spec = creative.object_story_spec;
  const candidates = [
    spec?.link_data?.picture,
    spec?.photo_data?.url,
    spec?.video_data?.image_url,
    creative.image_url,
    creative.thumbnail_url,
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

function creativeImageScore(url: string) {
  let score = url.length;
  const p = url.match(/[?&/](?:p|s)(\d+)x(\d+)/i);
  if (p) score += Math.min(Number(p[1]) || 0, Number(p[2]) || 0);
  const low = url.toLowerCase();
  if (low.includes('thumbnail')) score -= 600;
  if (low.includes('p50x50') || low.includes('p64x64') || low.includes('p130x130')) score -= 800;
  return score;
}

export function isLikelyLowResAdImage(url: string | null | undefined) {
  const u = url?.trim();
  if (!u) return true;
  const low = u.toLowerCase();
  if (low.includes('thumbnail')) return true;
  const small = low.match(/[?&/](?:p|s)(\d+)x(\d+)/i);
  if (small) {
    const w = Number(small[1]);
    const h = Number(small[2]);
    if (w > 0 && h > 0 && Math.max(w, h) < 400) return true;
  }
  return false;
}

export async function fetchMetaAdCreative(adId: string, token: string): Promise<MetaAdCreative | null> {
  const url = new URL(`${GRAPH}/${encodeURIComponent(adId)}`);
  url.searchParams.set('fields', CREATIVE_FIELDS);
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const ad = await res.json() as { name?: string; creative?: GraphCreative };
  const image = pickBestCreativeImageUrl(ad.creative);
  return {
    thumbnail_url: image,
    headline: ad.creative?.title || null,
    body: ad.creative?.body || null,
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