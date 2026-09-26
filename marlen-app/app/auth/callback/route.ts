import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isEmbedPanelRequest, opsContextCookieOptions } from '@/lib/embed-panel';
import { OPS_PENDING_COOKIE, OPS_SESSION_COOKIE } from '@/lib/ops-support-audit';
import { createClientOnResponse } from '@/lib/supabase/server';
import { signOpsSession, verifyOpsPending } from '@/lib/ops-support-token';

export const dynamic = 'force-dynamic';

function safeNext(raw: string | null, origin: string) {
  const path = !raw || !raw.startsWith('/') || raw.startsWith('//') ? '/agenda' : raw.split('?')[0] ?? '/agenda';
  return new URL(path, origin);
}

function applyOpsToUrl(
  nextUrl: URL,
  meta: { companyName: string; opsEmail: string },
) {
  nextUrl.searchParams.set('ops_support', '1');
  nextUrl.searchParams.set('ops_company', meta.companyName);
  nextUrl.searchParams.set('ops_by', meta.opsEmail);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const origin = url.origin;
  const embed = isEmbedPanelRequest(req);

  if (!code) {
    const fail = new URL('/login', origin);
    fail.searchParams.set('error', 'ops_session');
    if (embed) fail.searchParams.set('embed', '1');
    return NextResponse.redirect(fail);
  }

  const nextUrl = safeNext(url.searchParams.get('next'), origin);
  const pending = verifyOpsPending(cookies().get(OPS_PENDING_COOKIE)?.value);

  const opsCompany = url.searchParams.get('ops_company') ?? pending?.companyName;
  const opsBy = url.searchParams.get('ops_by') ?? pending?.opsEmail;
  const salonId = url.searchParams.get('salon_id') ?? pending?.salonId;
  const staffUserId = url.searchParams.get('staff_user_id') ?? pending?.staffUserId;
  const fromOps = url.searchParams.get('from_ops') === '1' || !!pending;

  if (fromOps && opsCompany && opsBy) {
    applyOpsToUrl(nextUrl, { companyName: opsCompany, opsEmail: opsBy });
  }
  if (embed) nextUrl.searchParams.set('embed', '1');

  const res = NextResponse.redirect(nextUrl);
  const sb = createClientOnResponse(res, embed);
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    const fail = new URL('/login', origin);
    fail.searchParams.set('error', 'ops_session');
    if (embed) fail.searchParams.set('embed', '1');
    return NextResponse.redirect(fail);
  }

  if (fromOps && opsCompany && opsBy && salonId && staffUserId) {
    res.cookies.set(OPS_SESSION_COOKIE, signOpsSession({
      salonId,
      staffUserId,
      opsEmail: opsBy,
      companyName: opsCompany,
    }), {
      ...opsContextCookieOptions(embed),
      maxAge: 8 * 60 * 60,
    });
    res.cookies.set(OPS_PENDING_COOKIE, '', { path: '/', maxAge: 0 });

    try {
      const admin = createAdminClient();
      const { data: staffRow } = await admin
        .from('staff')
        .select('full_name')
        .eq('id', staffUserId)
        .maybeSingle();
      await admin.from('ops_support_audit').insert({
        salon_id: salonId,
        ops_email: opsBy,
        company_label: opsCompany,
        staff_user_id: staffUserId,
        staff_name: (staffRow?.full_name as string | null) ?? null,
        action: 'session_start',
        detail: { next: nextUrl.pathname, via: pending ? 'callback_pending' : 'callback' },
      });
    } catch {
      /* audit opcional */
    }
  }

  return res;
}
