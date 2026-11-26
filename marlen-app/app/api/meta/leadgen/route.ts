import { createHmac, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchMetaAdCreative, upsertMetaAdRow } from '@/lib/meta-lead-creative';
import { leadFieldsFromMeta, leadFormRowsFromMeta } from '@/lib/leads';
import { notifyNewLead } from '@/lib/lead-push';

export const dynamic = 'force-dynamic';

type GraphField = { name?: string; values?: string[] };

function signed(raw: string, header: string | null) {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const got = header.slice('sha256='.length);
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function graph<T>(id: string, token: string, fields: string): Promise<T | null> {
  const url = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(id)}`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (mode === 'subscribe' && expected && token === expected) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('no', { status: 403 });
}

export async function POST(req: Request) {
  if (!process.env.META_APP_SECRET?.trim()) {
    return new Response('sin secreto', { status: 503 });
  }
  const raw = await req.text();
  if (!signed(raw, req.headers.get('x-hub-signature-256'))) {
    return new Response('firma', { status: 401 });
  }
  let body: {
    entry?: {
      id?: string;
      changes?: { field?: string; value?: { leadgen_id?: string; page_id?: string; ad_id?: string } }[];
    }[];
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('json', { status: 400 });
  }

  const sb = createAdminClient();
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue;
      const leadgenId = change.value?.leadgen_id;
      const pageId = change.value?.page_id || entry.id;
      if (!leadgenId || !pageId) continue;
      await ingest(sb, pageId, leadgenId, change.value?.ad_id ?? null);
    }
  }
  return new Response('ok', { status: 200 });
}

async function ingest(
  sb: ReturnType<typeof createAdminClient>,
  pageId: string,
  leadgenId: string,
  hintedAdId: string | null,
) {
  const { data: conn } = await sb
    .from('meta_connections')
    .select('salon_id, page_access_token')
    .eq('page_id', pageId)
    .maybeSingle();
  if (!conn) return;
  const salonId = conn.salon_id as string;
  const { data: salon } = await sb
    .from('salons')
    .select('feature_leads, name')
    .eq('id', salonId)
    .maybeSingle();
  if (!salon?.feature_leads) return;

  const token = conn.page_access_token as string;
  const lead = await graph<{
    ad_id?: string;
    ad_name?: string;
    campaign_id?: string;
    campaign_name?: string;
    field_data?: GraphField[];
  }>(leadgenId, token, 'ad_id,ad_name,campaign_id,campaign_name,field_data');
  if (!lead) return;

  const who = leadFieldsFromMeta(lead.field_data);
  const adId = lead.ad_id || hintedAdId;
  let thumbnail: string | null = null;
  let headline: string | null = null;
  let adBody: string | null = null;
  let adName = lead.ad_name ?? null;
  if (adId) {
    const creative = await fetchMetaAdCreative(adId, token);
    if (creative) {
      thumbnail = creative.thumbnail_url;
      headline = creative.headline;
      adBody = creative.body;
      adName = adName || creative.ad_name;
      await upsertMetaAdRow(sb, {
        salonId,
        campaignId: lead.campaign_id ?? null,
        campaignName: lead.campaign_name ?? null,
        adId,
        adName,
        creative,
      });
    }
  }

  const formFields = leadFormRowsFromMeta(lead.field_data);

  const { data: inserted, error } = await sb.from('leads').insert({
    salon_id: salonId,
    full_name: who.fullName,
    phone: who.phone,
    email: who.email,
    meta_lead_id: leadgenId,
    campaign_id: lead.campaign_id ?? null,
    campaign_name: lead.campaign_name ?? null,
    ad_id: adId ?? null,
    ad_name: adName,
    thumbnail_url: thumbnail,
    ad_headline: headline,
    ad_body: adBody,
    form_fields: formFields,
  }).select('id').maybeSingle();

  if (error || !inserted?.id) return;
  await notifyNewLead({
    salonId,
    leadId: inserted.id as string,
    name: who.fullName,
    phone: who.phone,
    campaign: lead.campaign_name,
    ad: lead.ad_name,
    fromMeta: true,
  }).catch(() => undefined);
}

