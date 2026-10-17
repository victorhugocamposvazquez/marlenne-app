import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  amazonAuthUrl,
  amazonCallbackUri,
  amazonConfigured,
  disconnectAmazon,
} from '@/lib/amazon-business';
import {
  disconnectMeta,
  metaAuthUrl,
  metaCallbackUri,
  metaConfigured,
} from '@/lib/meta-business-invoices';
import { appOriginFromRequest } from '@/lib/app-origin';
import { requireVendorInvoicesAccess } from '@/lib/vendor-invoices-access';
import { signOAuthState } from '@/lib/vendor-oauth-state';

export const runtime = 'nodejs';

/** GET ?vendor=amazon_business|meta → redirect OAuth o { configured: false } */
export async function GET(req: Request) {
  const access = await requireVendorInvoicesAccess();
  if (!access.ok) return access.response;
  const { me } = access;
  if (me.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admin puede conectar cuentas' }, { status: 403 });
  }

  const url = new URL(req.url);
  const vendor = url.searchParams.get('vendor');
  const origin = appOriginFromRequest(req);

  if (vendor === 'amazon_business') {
    if (!amazonConfigured()) {
      return NextResponse.json({
        configured: false,
        error: 'Faltan AMAZON_LWA_CLIENT_ID / AMAZON_LWA_CLIENT_SECRET en el servidor',
      });
    }
    const state = signOAuthState(me.salon_id, 'amazon_business');
    const redirectUri = amazonCallbackUri(origin);
    return NextResponse.redirect(amazonAuthUrl(state, redirectUri));
  }

  if (vendor === 'meta') {
    if (!metaConfigured()) {
      return NextResponse.json({
        configured: false,
        error: 'Faltan META_APP_ID / META_APP_SECRET en el servidor',
      });
    }
    const state = signOAuthState(me.salon_id, 'meta');
    const redirectUri = metaCallbackUri(origin);
    return NextResponse.redirect(metaAuthUrl(state, redirectUri));
  }

  return NextResponse.json({ error: 'vendor inválido' }, { status: 400 });
}

/** DELETE ?vendor=… → desconectar */
export async function DELETE(req: Request) {
  const access = await requireVendorInvoicesAccess();
  if (!access.ok) return access.response;
  const { me } = access;
  if (me.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admin puede desconectar' }, { status: 403 });
  }

  const vendor = new URL(req.url).searchParams.get('vendor');
  const sb = createClient();
  if (vendor === 'amazon_business') {
    await disconnectAmazon(sb, me.salon_id);
    return NextResponse.json({ ok: true });
  }
  if (vendor === 'meta') {
    await disconnectMeta(sb, me.salon_id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'vendor inválido' }, { status: 400 });
}
