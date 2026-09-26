import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { NextResponse } from 'next/server';
import { createClientOnResponse } from '@/lib/supabase/server';

type LinkProps = {
  hashed_token?: string;
  email_otp?: string;
  verification_type?: string;
};

const OTP_TYPES = ['magiclink', 'email', 'signup', 'invite'] as const;

function serverAnonAuthClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function verifyOtpSession(
  client: SupabaseClient,
  params: Parameters<SupabaseClient['auth']['verifyOtp']>[0],
): Promise<Session | null> {
  const { data, error } = await client.auth.verifyOtp(params);
  if (error || !data.session?.access_token || !data.session.refresh_token) return null;
  return data.session;
}

/** Magic link del admin API → sesión en cookies de la respuesta (sin PKCE en callback). */
export async function sessionFromAdminMagicLink(
  admin: SupabaseClient,
  email: string,
  props: LinkProps | null | undefined,
): Promise<Session | null> {
  if (!props) return null;
  const clients = [serverAnonAuthClient(), admin].filter(Boolean) as SupabaseClient[];

  const tokenHash = props.hashed_token;
  if (tokenHash) {
    const types = [
      props.verification_type,
      ...OTP_TYPES,
    ].filter((t): t is string => typeof t === 'string' && t.length > 0);
    const seen = new Set<string>();
    for (const type of types) {
      if (seen.has(type)) continue;
      seen.add(type);
      const params = {
        type: type as (typeof OTP_TYPES)[number],
        token_hash: tokenHash,
      };
      for (const client of clients) {
        const session = await verifyOtpSession(client, params);
        if (session) return session;
      }
    }
  }

  const otp = props.email_otp?.trim();
  if (otp) {
    const params = { email, token: otp, type: 'email' as const };
    for (const client of clients) {
      const session = await verifyOtpSession(client, params);
      if (session) return session;
    }
  }

  return null;
}

export async function attachSessionToResponse(
  response: NextResponse,
  session: Session,
  crossSiteEmbed = false,
): Promise<boolean> {
  const sb = createClientOnResponse(response, crossSiteEmbed);
  const { error } = await sb.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return !error;
}
