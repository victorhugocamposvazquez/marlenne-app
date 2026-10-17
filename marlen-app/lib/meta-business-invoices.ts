import type { SupabaseClient } from '@supabase/supabase-js';
import { appOriginFromEnv } from '@/lib/app-origin';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';
import { periodRange } from '@/lib/vendor-invoices';
import { storeVendorPdf } from '@/lib/vendor-invoices-store';

export function metaConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID?.trim()
    && process.env.META_APP_SECRET?.trim(),
  );
}

export function metaGraphVersion(): string {
  return process.env.META_GRAPH_VERSION?.trim() || 'v21.0';
}

export function metaCallbackUri(origin?: string): string {
  const base = (origin || appOriginFromEnv()).replace(/\/$/, '');
  return `${base}/api/integrations/meta/callback`;
}

export function metaAuthUrl(state: string, redirectUri: string): string {
  const appId = process.env.META_APP_ID!.trim();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    scope: 'business_management',
  });
  return `https://www.facebook.com/${metaGraphVersion()}/dialog/oauth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!.trim(),
    client_secret: process.env.META_APP_SECRET!.trim(),
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/${metaGraphVersion()}/oauth/access_token?${params}`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(t || `Meta OAuth falló (${res.status})`);
  }
  return res.json() as Promise<TokenResponse>;
}

async function longLivedToken(shortToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!.trim(),
    client_secret: process.env.META_APP_SECRET!.trim(),
    fb_exchange_token: shortToken,
  });
  const res = await fetch(
    `https://graph.facebook.com/${metaGraphVersion()}/oauth/access_token?${params}`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(t || `Meta long-lived falló (${res.status})`);
  }
  return res.json() as Promise<TokenResponse>;
}

async function fetchBusinessId(accessToken: string): Promise<string | null> {
  const res = await fetch(
    `https://graph.facebook.com/${metaGraphVersion()}/me/businesses?fields=id,name&limit=1&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!res.ok) return null;
  const json = await res.json() as { data?: Array<{ id: string }> };
  return json.data?.[0]?.id ?? null;
}

export async function saveMetaConnection(
  sb: SupabaseClient,
  salonId: string,
  code: string,
  redirectUri: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const short = await exchangeCode(code, redirectUri);
    let tokens = short;
    try {
      tokens = await longLivedToken(short.access_token);
    } catch {
      /* short-lived sigue valiendo para sync inmediato */
    }
    const accessEnc = encryptSecret(tokens.access_token);
    if (!accessEnc) {
      return { ok: false, error: 'No hay secreto de cifrado (VENDOR_TOKEN_SECRET) en el servidor' };
    }
    const businessId = await fetchBusinessId(tokens.access_token);
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error } = await sb.from('salon_vendor_connections').upsert(
      {
        salon_id: salonId,
        vendor: 'meta',
        status: 'connected',
        access_token_enc: accessEnc,
        refresh_token_enc: null,
        token_expires_at: expiresAt,
        external_account_id: businessId,
        connected_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'salon_id,vendor' },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error OAuth Meta' };
  }
}

type MetaInvoice = {
  id: string;
  invoice_id?: string;
  billing_period?: { start?: string; end?: string };
  amount_due?: { amount?: string; currency?: string };
  download_uri?: string;
  cdn_download_uri?: string;
  invoice_date?: string;
};

export async function syncMetaInvoices(
  sb: SupabaseClient,
  salonId: string,
  periodKey: string,
): Promise<{ ok: true; imported: number; skipped: number } | { ok: false; error: string }> {
  if (!metaConfigured()) {
    return { ok: false, error: 'Faltan META_APP_ID / META_APP_SECRET en el servidor' };
  }

  const { data: conn, error: connErr } = await sb
    .from('salon_vendor_connections')
    .select('access_token_enc, external_account_id, status')
    .eq('salon_id', salonId)
    .eq('vendor', 'meta')
    .maybeSingle();

  if (connErr || !conn || conn.status !== 'connected') {
    return { ok: false, error: 'Meta Business no está conectado' };
  }

  const token = decryptSecret(conn.access_token_enc as string | null);
  if (!token) return { ok: false, error: 'Token Meta ilegible; vuelve a conectar' };

  let businessId = (conn.external_account_id as string | null) || null;
  if (!businessId) {
    businessId = await fetchBusinessId(token);
    if (businessId) {
      await sb.from('salon_vendor_connections').update({
        external_account_id: businessId,
        updated_at: new Date().toISOString(),
      }).eq('salon_id', salonId).eq('vendor', 'meta');
    }
  }
  if (!businessId) {
    return { ok: false, error: 'No se encontró un Business Manager en la cuenta Meta' };
  }

  const { from, to } = periodRange(periodKey);
  const url = new URL(
    `https://graph.facebook.com/${metaGraphVersion()}/${businessId}/business_invoices`,
  );
  url.searchParams.set('start_date', from);
  url.searchParams.set('end_date', to);
  url.searchParams.set(
    'fields',
    'id,invoice_id,invoice_date,billing_period,amount_due,download_uri,cdn_download_uri',
  );
  url.searchParams.set('access_token', token);

  const listRes = await fetch(url.toString());
  if (!listRes.ok) {
    const t = await listRes.text().catch(() => '');
    await sb.from('salon_vendor_connections').update({
      status: 'error',
      last_error: (t || `Meta ${listRes.status}`).slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq('salon_id', salonId).eq('vendor', 'meta');
    return {
      ok: false,
      error: t || `Meta no devolvió facturas (${listRes.status}). Revisa app review / permisos.`,
    };
  }

  const json = await listRes.json() as { data?: MetaInvoice[] };
  const invoices = json.data ?? [];
  let imported = 0;
  let skipped = 0;

  for (const inv of invoices) {
    const dl = inv.cdn_download_uri || inv.download_uri;
    if (!dl) {
      skipped += 1;
      continue;
    }
    const pdfRes = await fetch(dl);
    if (!pdfRes.ok) {
      skipped += 1;
      continue;
    }
    const pdf = Buffer.from(await pdfRes.arrayBuffer());
    const extId = String(inv.invoice_id || inv.id);
    const issuedAt = (inv.invoice_date || inv.billing_period?.start || from).slice(0, 10);
    const amountRaw = inv.amount_due?.amount;
    const amountCents = amountRaw != null ? Math.round(Number(amountRaw) * 100) : null;

    const stored = await storeVendorPdf(sb, {
      salonId,
      vendor: 'meta',
      externalId: extId,
      title: `Meta ${extId}`,
      issuedAt,
      amountCents,
      source: 'meta_api',
      pdf,
    });
    if (stored.ok) imported += 1;
    else skipped += 1;
  }

  await sb.from('salon_vendor_connections').update({
    status: 'connected',
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('salon_id', salonId).eq('vendor', 'meta');

  return { ok: true, imported, skipped };
}

export async function disconnectMeta(
  sb: SupabaseClient,
  salonId: string,
): Promise<void> {
  await sb.from('salon_vendor_connections').upsert(
    {
      salon_id: salonId,
      vendor: 'meta',
      status: 'disconnected',
      access_token_enc: null,
      refresh_token_enc: null,
      token_expires_at: null,
      external_account_id: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'salon_id,vendor' },
  );
}
