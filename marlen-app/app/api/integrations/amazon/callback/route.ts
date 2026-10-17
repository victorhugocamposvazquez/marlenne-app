import { NextResponse } from 'next/server';
import { amazonCallbackUri, saveAmazonConnection } from '@/lib/amazon-business';
import { appOriginFromRequest } from '@/lib/app-origin';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyOAuthState } from '@/lib/vendor-oauth-state';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error_description') || url.searchParams.get('error');
  const origin = appOriginFromRequest(req);
  const finanzas = `${origin}/finanzas?vendor=amazon`;

  if (err) {
    return NextResponse.redirect(`${finanzas}&vendor_err=${encodeURIComponent(err)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${finanzas}&vendor_err=${encodeURIComponent('OAuth incompleto')}`);
  }

  const verified = verifyOAuthState(state);
  if (!verified.ok || verified.vendor !== 'amazon_business') {
    return NextResponse.redirect(`${finanzas}&vendor_err=${encodeURIComponent('State OAuth inválido')}`);
  }

  const sb = createAdminClient();
  const result = await saveAmazonConnection(
    sb,
    verified.salonId,
    code,
    amazonCallbackUri(origin),
  );
  if (!result.ok) {
    return NextResponse.redirect(
      `${finanzas}&vendor_err=${encodeURIComponent(result.error)}`,
    );
  }
  return NextResponse.redirect(`${finanzas}&vendor_ok=amazon`);
}
