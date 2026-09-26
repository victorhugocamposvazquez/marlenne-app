import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClientOnResponse } from '@/lib/supabase/server';
import { OPS_SESSION_COOKIE } from '@/lib/ops-support-audit';
import { signOpsSession, verifyOpsEnterToken } from '@/lib/ops-support-token';

export const dynamic = 'force-dynamic';

const REPLAY_MS = 3 * 60 * 1000;

function safeNext(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return '/agenda';
  return path.split('?')[0] ?? '/agenda';
}

function loginRedirect(origin: string, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, origin));
}

async function tokenAllowed(
  admin: SupabaseClient,
  jti: string,
  expiresMs: number,
): Promise<boolean> {
  const now = Date.now();
  if (expiresMs < now) return false;

  const { data: consumed, error } = await admin
    .from('ops_support_token')
    .update({ consumed_at: new Date().toISOString() })
    .eq('jti', jti)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('jti')
    .maybeSingle();

  if (!error && consumed) return true;

  const { data: row } = await admin
    .from('ops_support_token')
    .select('consumed_at, expires_at')
    .eq('jti', jti)
    .maybeSingle();

  if (!row?.consumed_at) return false;
  const consumedAt = new Date(row.consumed_at as string).getTime();
  const exp = new Date(row.expires_at as string).getTime();
  return exp > now && now - consumedAt < REPLAY_MS;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t')?.trim();
  if (!token) return loginRedirect(url.origin, 'ops');

  const payload = verifyOpsEnterToken(token);
  if (!payload) return loginRedirect(url.origin, 'ops_expired');

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return loginRedirect(url.origin, 'ops_config');
  }

  const allowed = await tokenAllowed(admin, payload.jti, payload.e);
  if (!allowed) return loginRedirect(url.origin, 'ops_used');

  const { data: staff } = await admin
    .from('staff')
    .select('id, full_name, salon_id, is_active')
    .eq('id', payload.staffUserId)
    .eq('salon_id', payload.salonId)
    .maybeSingle();

  if (!staff?.is_active) return loginRedirect(url.origin, 'ops_staff');

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(payload.staffUserId);
  const email = userData.user?.email;
  if (userError || !email) return loginRedirect(url.origin, 'ops_staff');

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return loginRedirect(url.origin, 'ops_session');

  const next = safeNext(payload.next);
  const redirectUrl = new URL(next, url.origin);
  redirectUrl.searchParams.set('ops_support', '1');
  redirectUrl.searchParams.set('ops_company', payload.companyName);
  redirectUrl.searchParams.set('ops_by', payload.opsEmail);

  const res = NextResponse.redirect(redirectUrl);
  const sb = createClientOnResponse(res);
  const { error: otpError } = await sb.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
  if (otpError) return loginRedirect(url.origin, 'ops_session');

  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(OPS_SESSION_COOKIE, signOpsSession({
    salonId: payload.salonId,
    staffUserId: payload.staffUserId,
    opsEmail: payload.opsEmail,
    companyName: payload.companyName,
  }), {
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
