import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

function secret(): string {
  return (
    process.env.VENDOR_TOKEN_SECRET?.trim()
    || process.env.CRON_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || 'dev-oauth-state'
  );
}

/** state = salonId.vendor.nonce.sig — firmado para el callback OAuth. */
export function signOAuthState(salonId: string, vendor: 'amazon_business' | 'meta'): string {
  const nonce = randomBytes(8).toString('base64url');
  const payload = `${salonId}.${vendor}.${nonce}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyOAuthState(
  state: string,
): { ok: true; salonId: string; vendor: 'amazon_business' | 'meta' } | { ok: false } {
  const parts = state.split('.');
  if (parts.length !== 4) return { ok: false };
  const [salonId, vendor, nonce, sig] = parts;
  if (vendor !== 'amazon_business' && vendor !== 'meta') return { ok: false };
  const payload = `${salonId}.${vendor}.${nonce}`;
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true, salonId, vendor };
}
