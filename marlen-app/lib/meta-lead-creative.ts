/** Creatividad del anuncio en Graph (Meta leads). */

import type { createAdminClient } from '@/lib/supabase/admin';
import type { createClient } from '@/lib/supabase/server';

type Db = ReturnType<typeof createAdminClient> | ReturnType<typeof createClient>;

const GRAPH = 'https://graph.facebook.com/v21.0';

export type MetaAdCreative = {
  thumbnail_url: string | null;
  headline: string | null;
  body: string | null;
  ad_name: string | null;
};

export async function fetchMetaAdCreative(adId: string, token: string): Promise<MetaAdCreative | null> {
  const url = new URL(`${GRAPH}/${encodeURIComponent(adId)}`);
  url.searchParams.set('fields', 'name,creative{thumbnail_url,title,body,image_url}');
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const ad = await res.json() as {
    name?: string;
    creative?: { thumbnail_url?: string; title?: string; body?: string; image_url?: string };
  };
  return {
    thumbnail_url: ad.creative?.image_url || ad.creative?.thumbnail_url || null,
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

/** Rellena miniatura y textos del anuncio en leads que vinieron del import sin creatividad. */
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
    .eq('ad_id', adId)
    .or('thumbnail_url.is.null,ad_headline.is.null');
}