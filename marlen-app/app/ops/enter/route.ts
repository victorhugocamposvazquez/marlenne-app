import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { OPS_PENDING_COOKIE, OPS_SESSION_COOKIE } from '@/lib/ops-support-audit';
import { attachSessionToResponse, sessionFromAdminMagicLink } from '@/lib/ops-establish-session';
import { appOriginFromRequest } from '@/lib/app-origin';
import {
  signOpsPending,
  signOpsSession,
  verifyOpsEnterToken,
  type OpsEnterPayload,
} from '@/lib/ops-support-token';

export const dynamic = 'force-dynamic';

const REPLAY_MS = 3 * 60 * 1000;

function safeNext(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return '/agenda';
  return path.split('?')[0] ?? '/agenda';
}

function loginRedirect(origin: string, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, origin));
}

function authCallbackRedirectTo(origin: string, next: string) {
  const u = new URL('/auth/callback', origin);
  u.searchParams.set('next', next);
  return u.toString();
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

function finishRedirect(
  origin: string,
  next: string,
  payload: OpsEnterPayload,
  response: NextResponse,
  staffName: string,
  admin: SupabaseClient,
  via: string,
) {
  const redirectUrl = new URL(next, origin);
  redirectUrl.searchParams.set('ops_support', '1');
  redirectUrl.searchParams.set('ops_company', payload.companyName);
  redirectUrl.searchParams.set('ops_by', payload.opsEmail);
  response.headers.set('Location', redirectUrl.toString());

  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(OPS_SESSION_COOKIE, signOpsSession({
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

  void admin.from('ops_support_audit').insert({
    salon_id: payload.salonId,
    ops_email: payload.opsEmail,
    company_label: payload.companyName,
    staff_user_id: payload.staffUserId,
    staff_name: staffName,
    action: 'session_start',
    detail: { next, via },
  });

  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOriginFromRequest(req);
  const token = url.searchParams.get('t')?.trim();
  if (!token) return loginRedirect(origin, 'ops');

  const payload = verifyOpsEnterToken(token);
  if (!payload) return loginRedirect(origin, 'ops_expired');

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return loginRedirect(origin, 'ops_config');
  }

  const allowed = await tokenAllowed(admin, payload.jti, payload.e);
  if (!allowed) return loginRedirect(origin, 'ops_used');

  const { data: staff } = await admin
    .from('staff')
    .select('id, full_name, salon_id, is_active')
    .eq('id', payload.staffUserId)
    .eq('salon_id', payload.salonId)
    .maybeSingle();

  if (!staff?.is_active) return loginRedirect(origin, 'ops_staff');

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(payload.staffUserId);
  const email = userData.user?.email;
  if (userError || !email) return loginRedirect(origin, 'ops_staff');

  const next = safeNext(payload.next);
  const redirectTo = authCallbackRedirectTo(origin, next);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  const props = link?.properties;
  const actionLink = props?.action_link;

  if (linkError || (!props?.hashed_token && !props?.email_otp && !actionLink)) {
    return loginRedirect(origin, 'ops_session');
  }

  const session = await sessionFromAdminMagicLink(admin, email, props);
  if (session) {
    const res = NextResponse.redirect(new URL('/agenda', origin));
    const ok = await attachSessionToResponse(res, session);
    if (ok) {
      return finishRedirect(
        origin,
        next,
        payload,
        res,
        staff.full_name as string,
        admin,
        'admin_verifyOtp',
      );
    }
  }

  if (actionLink) {
    const res = NextResponse.redirect(actionLink);
    const secure = process.env.NODE_ENV === 'production';
    res.cookies.set(
      OPS_PENDING_COOKIE,
      signOpsPending({
        salonId: payload.salonId,
        staffUserId: payload.staffUserId,
        opsEmail: payload.opsEmail,
        companyName: payload.companyName,
        next,
      }),
      {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60,
      },
    );
    return res;
  }

  return loginRedirect(origin, 'ops_session');
}
