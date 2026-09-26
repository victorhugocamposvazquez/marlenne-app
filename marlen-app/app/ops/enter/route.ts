import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { OPS_SESSION_COOKIE } from '@/lib/ops-support-audit';
import { signOpsSession, verifyOpsEnterToken } from '@/lib/ops-support-token';

export const dynamic = 'force-dynamic';

function safeNext(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return '/agenda';
  return path.split('?')[0] ?? '/agenda';
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t')?.trim();
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=ops', url.origin));
  }

  const payload = verifyOpsEnterToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login?error=ops_expired', url.origin));
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.redirect(new URL('/login?error=ops_config', url.origin));
  }

  const { data: consumed, error: consumeErr } = await admin
    .from('ops_support_token')
    .update({ consumed_at: new Date().toISOString() })
    .eq('jti', payload.jti)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('jti')
    .maybeSingle();

  if (consumeErr || !consumed) {
    return NextResponse.redirect(new URL('/login?error=ops_used', url.origin));
  }

  const { data: staff } = await admin
    .from('staff')
    .select('id, full_name, salon_id, is_active')
    .eq('id', payload.staffUserId)
    .eq('salon_id', payload.salonId)
    .maybeSingle();

  if (!staff?.is_active) {
    return NextResponse.redirect(new URL('/login?error=ops_staff', url.origin));
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(payload.staffUserId);
  const email = userData.user?.email;
  if (userError || !email) {
    return NextResponse.redirect(new URL('/login?error=ops_staff', url.origin));
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return NextResponse.redirect(new URL('/login?error=ops_session', url.origin));
  }

  const sb = createClient();
  const { error: otpError } = await sb.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
  if (otpError) {
    return NextResponse.redirect(new URL('/login?error=ops_session', url.origin));
  }

  const next = safeNext(payload.next);
  const redirectUrl = new URL(next, url.origin);
  redirectUrl.searchParams.set('ops_support', '1');
  redirectUrl.searchParams.set('ops_company', payload.companyName);
  redirectUrl.searchParams.set('ops_by', payload.opsEmail);

  const res = NextResponse.redirect(redirectUrl);
  const secure = process.env.NODE_ENV === 'production';
  const sessionVal = signOpsSession({
    salonId: payload.salonId,
    staffUserId: payload.staffUserId,
    opsEmail: payload.opsEmail,
    companyName: payload.companyName,
  });
  res.cookies.set(OPS_SESSION_COOKIE, sessionVal, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });

  await admin.from('ops_support_audit').insert({
    salon_id: payload.salonId,
    ops_email: payload.opsEmail,
    company_label: payload.companyName,
    staff_user_id: payload.staffUserId,
    staff_name: staff.full_name as string,
    action: 'session_start',
    detail: { next, staff_user_id: payload.staffUserId },
  });

  return res;
}
