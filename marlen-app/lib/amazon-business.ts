import type { SupabaseClient } from '@supabase/supabase-js';
import { appOriginFromEnv } from '@/lib/app-origin';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';
import { periodRange } from '@/lib/vendor-invoices';
import { storeVendorPdf } from '@/lib/vendor-invoices-store';

const LWA_TOKEN = 'https://api.amazon.com/auth/o2/token';
const LWA_AUTH = 'https://www.amazon.com/ap/oa';

export function amazonConfigured(): boolean {
  return Boolean(
    process.env.AMAZON_LWA_CLIENT_ID?.trim()
    && process.env.AMAZON_LWA_CLIENT_SECRET?.trim(),
  );
}

export function amazonApiEndpoint(): string {
  return (
    process.env.AMAZON_AB_API_ENDPOINT?.trim()
    || 'https://eu.business-api.amazon.com'
  ).replace(/\/$/, '');
}

export function amazonAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.AMAZON_LWA_CLIENT_ID!.trim();
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'profile businesscommunications::document',
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
  });
  return `${LWA_AUTH}?${params.toString()}`;
}

export function amazonCallbackUri(origin?: string): string {
  const base = (origin || appOriginFromEnv()).replace(/\/$/, '');
  return `${base}/api/integrations/amazon/callback`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: process.env.AMAZON_LWA_CLIENT_ID!.trim(),
    client_secret: process.env.AMAZON_LWA_CLIENT_SECRET!.trim(),
  });
  const res = await fetch(LWA_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(t || `Amazon OAuth falló (${res.status})`);
  }
  return res.json() as Promise<TokenResponse>;
}

async function refreshAccess(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.AMAZON_LWA_CLIENT_ID!.trim(),
    client_secret: process.env.AMAZON_LWA_CLIENT_SECRET!.trim(),
  });
  const res = await fetch(LWA_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(t || `Amazon refresh falló (${res.status})`);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function saveAmazonConnection(
  sb: SupabaseClient,
  salonId: string,
  code: string,
  redirectUri: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const tokens = await exchangeCode(code, redirectUri);
    const accessEnc = encryptSecret(tokens.access_token);
    const refreshEnc = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null;
    if (!accessEnc) {
      return { ok: false, error: 'No hay secreto de cifrado (VENDOR_TOKEN_SECRET) en el servidor' };
    }
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error } = await sb.from('salon_vendor_connections').upsert(
      {
        salon_id: salonId,
        vendor: 'amazon_business',
        status: 'connected',
        access_token_enc: accessEnc,
        refresh_token_enc: refreshEnc,
        token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'salon_id,vendor' },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error OAuth Amazon' };
  }
}

async function accessTokenForSalon(
  sb: SupabaseClient,
  salonId: string,
): Promise<string> {
  const { data, error } = await sb
    .from('salon_vendor_connections')
    .select('access_token_enc, refresh_token_enc, token_expires_at')
    .eq('salon_id', salonId)
    .eq('vendor', 'amazon_business')
    .maybeSingle();
  if (error || !data) throw new Error('Amazon Business no está conectado');

  const access = decryptSecret(data.access_token_enc as string | null);
  const refresh = decryptSecret(data.refresh_token_enc as string | null);
  if (!access && !refresh) throw new Error('Tokens Amazon ilegibles; vuelve a conectar');

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at as string).getTime() : 0;
  const stillValid = access && expiresAt > Date.now() + 60_000;
  if (stillValid) return access!;

  if (!refresh) {
    if (access) return access;
    throw new Error('Sesión Amazon caducada; vuelve a conectar');
  }

  const tokens = await refreshAccess(refresh);
  const accessEnc = encryptSecret(tokens.access_token);
  const refreshEnc = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : encryptSecret(refresh);
  await sb.from('salon_vendor_connections').update({
    access_token_enc: accessEnc,
    refresh_token_enc: refreshEnc,
    token_expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    status: 'connected',
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('salon_id', salonId).eq('vendor', 'amazon_business');

  return tokens.access_token;
}

type AbInvoiceLine = {
  invoiceId?: string;
  orderId?: string;
  invoiceDate?: string;
  invoiceAmount?: { amount?: number; currencyCode?: string };
};

/**
 * Lista facturas del periodo vía Reporting/Document API y descarga PDF (GET_AB_INVOICE_PDF).
 * Si la API no está disponible o el scope no alcanza, marca error en la conexión.
 */
export async function syncAmazonInvoices(
  sb: SupabaseClient,
  salonId: string,
  periodKey: string,
): Promise<{ ok: true; imported: number; skipped: number } | { ok: false; error: string }> {
  if (!amazonConfigured()) {
    return { ok: false, error: 'Faltan AMAZON_LWA_CLIENT_ID / AMAZON_LWA_CLIENT_SECRET en el servidor' };
  }

  let token: string;
  try {
    token = await accessTokenForSalon(sb, salonId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Sin token Amazon' };
  }

  const { from, to } = periodRange(periodKey);
  const endpoint = amazonApiEndpoint();

  // Reconciliation reports: intenta listar por rango de fechas.
  // Endpoint oficial Document API: reports con documentType GET_AB_INVOICE_PDF.
  let lines: AbInvoiceLine[] = [];
  try {
    const listUrl = new URL(`${endpoint}/reports/2021-09-30/documents`);
    listUrl.searchParams.set('reportTypes', 'GET_AB_INVOICE_PDF');
    listUrl.searchParams.set('createdSince', `${from}T00:00:00Z`);
    listUrl.searchParams.set('createdUntil', `${to}T23:59:59Z`);

    const listRes = await fetch(listUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-amz-access-token': token,
        Accept: 'application/json',
      },
    });

    if (listRes.status === 404 || listRes.status === 403) {
      // Fallback: invoices search si el tenant tiene Reconciliation API
      const invUrl = new URL(`${endpoint}/reconciliation/2021-01-08/invoices`);
      invUrl.searchParams.set('invoiceStartDate', from);
      invUrl.searchParams.set('invoiceEndDate', to);
      const invRes = await fetch(invUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-amz-access-token': token,
          Accept: 'application/json',
        },
      });
      if (!invRes.ok) {
        const t = await invRes.text().catch(() => '');
        await markAmazonError(sb, salonId, t || `Amazon list ${invRes.status}`);
        return {
          ok: false,
          error: t || `Amazon no devolvió facturas (${invRes.status}). Revisa permisos Document API.`,
        };
      }
      const invJson = await invRes.json() as { invoices?: AbInvoiceLine[] };
      lines = invJson.invoices ?? [];
    } else if (!listRes.ok) {
      const t = await listRes.text().catch(() => '');
      await markAmazonError(sb, salonId, t || `Amazon ${listRes.status}`);
      return { ok: false, error: t || `Error al listar facturas Amazon (${listRes.status})` };
    } else {
      const json = await listRes.json() as {
        documents?: Array<{ documentId?: string; invoiceId?: string; orderId?: string; createdTime?: string }>;
      };
      lines = (json.documents ?? []).map(d => ({
        invoiceId: d.invoiceId || d.documentId,
        orderId: d.orderId,
        invoiceDate: d.createdTime?.slice(0, 10),
      }));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error de red Amazon';
    await markAmazonError(sb, salonId, msg);
    return { ok: false, error: msg };
  }

  let imported = 0;
  let skipped = 0;

  for (const line of lines) {
    const orderId = line.orderId;
    const invoiceId = line.invoiceId || orderId;
    if (!invoiceId && !orderId) {
      skipped += 1;
      continue;
    }
    const extId = String(invoiceId || orderId);
    const issuedAt = (line.invoiceDate || from).slice(0, 10);

    // Document API: GET_AB_INVOICE_PDF — en ES/EU suele bastar orderId
    const pdfUrl = new URL(`${endpoint}/reports/2021-09-30/documents`);
    pdfUrl.searchParams.set('reportType', 'GET_AB_INVOICE_PDF');
    if (orderId) pdfUrl.searchParams.set('orderId', orderId);
    if (invoiceId) pdfUrl.searchParams.set('invoiceId', invoiceId);

    const pdfRes = await fetch(pdfUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-amz-access-token': token,
        Accept: 'application/pdf, application/json',
      },
    });

    if (!pdfRes.ok) {
      skipped += 1;
      continue;
    }

    const ctype = pdfRes.headers.get('content-type') || '';
    let pdf: Buffer;
    if (ctype.includes('application/json')) {
      const j = await pdfRes.json() as { url?: string; documentUrl?: string };
      const dl = j.url || j.documentUrl;
      if (!dl) {
        skipped += 1;
        continue;
      }
      const dlRes = await fetch(dl);
      if (!dlRes.ok) {
        skipped += 1;
        continue;
      }
      pdf = Buffer.from(await dlRes.arrayBuffer());
    } else {
      pdf = Buffer.from(await pdfRes.arrayBuffer());
    }

    const amountCents = line.invoiceAmount?.amount != null
      ? Math.round(Number(line.invoiceAmount.amount) * 100)
      : null;

    const stored = await storeVendorPdf(sb, {
      salonId,
      vendor: 'amazon_business',
      externalId: extId,
      title: `Amazon ${extId}`,
      issuedAt,
      amountCents,
      source: 'amazon_api',
      pdf,
    });
    if (stored.ok) imported += 1;
    else skipped += 1;
  }

  await sb.from('salon_vendor_connections').update({
    status: 'connected',
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('salon_id', salonId).eq('vendor', 'amazon_business');

  return { ok: true, imported, skipped };
}

async function markAmazonError(sb: SupabaseClient, salonId: string, msg: string) {
  await sb.from('salon_vendor_connections').update({
    status: 'error',
    last_error: msg.slice(0, 500),
    updated_at: new Date().toISOString(),
  }).eq('salon_id', salonId).eq('vendor', 'amazon_business');
}

export async function disconnectAmazon(
  sb: SupabaseClient,
  salonId: string,
): Promise<void> {
  await sb.from('salon_vendor_connections').upsert(
    {
      salon_id: salonId,
      vendor: 'amazon_business',
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
