import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { OPS_SESSION_COOKIE } from '@/lib/ops-support-audit';
import { createClientOnResponse } from '@/lib/supabase/server';
import { signOpsSession } from '@/lib/ops-support-token';

export const dynamic = 'force-dynamic';

function safeNext(raw: string | null, origin: string) {
  const path = !raw || !raw.startsWith('/') || raw.startsWith('//') ? '/agenda' : raw.split('?')[0] ?? '/agenda';
  return new URL(path, origin);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=ops_session', origin));
  }

  const nextUrl = safeNext(url.searchParams.get('next'), origin);
  const opsCompany = url.searchParams.get('ops_company');
  const opsBy = url.searchParams.get('ops_by');
  const salonId = url.searchParams.get('salon_id');
  const staffUserId = url.searchParams.get('staff_user_id');
  const fromOps = url.searchParams.get('from_ops') === '1';

  if (fromOps && opsCompany && opsBy) {
    nextUrl.searchParams.set('ops_support', '1');
    nextUrl.searchParams.set('ops_company', opsCompany);
    nextUrl.searchParams.set('ops_by', opsBy);
  }

  const res = NextResponse.redirect(nextUrl);
  const sb = createClientOnResponse(res);
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/login?error=ops_session', origin));
  }

  if (fromOps && opsCompany && opsBy && salonId && staffUserId) {
    const secure = process.env.NODE_ENV === 'production';
    res.cookies.set(OPS_SESSION_COOKIE, signOpsSession({
      salonId,
      staffUserId,
      opsEmail: opsBy,
      companyName: opsCompany,
    }), {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

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
        detail: { next: nextUrl.pathname, via: 'callback' },
      });
    } catch {
      /* audit opcional */
    }
  }

  return res;
}
