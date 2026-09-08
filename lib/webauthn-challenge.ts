import { createHmac, timingSafeEqual } from 'crypto';

export type ChallengeKind = 'r' | 'a';

export type ChallengePayload = {
  c: string;
  k: ChallengeKind;
  u?: string;
  e: number;
};

export function signChallenge(payload: ChallengePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyChallenge(
  token: string,
  secret: string,
  now = Date.now(),
): ChallengePayload | null {
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as ChallengePayload;
    if (!payload?.c || (payload.k !== 'r' && payload.k !== 'a') || payload.e < now) return null;
    return payload;
  } catch {
    return null;
  }
}
