import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { opsSupportSecret } from '@/lib/ops-support-secret';

export type OpsEnterPayload = {
  v: 1;
  jti: string;
  salonId: string;
  staffUserId: string;
  opsEmail: string;
  companyName: string;
  next: string;
  e: number;
};

const TTL_MS = 5 * 60 * 1000;

export function opsEnterTtlMs() {
  return TTL_MS;
}

export function signOpsEnterToken(input: Omit<OpsEnterPayload, 'v' | 'e' | 'jti'> & { jti?: string; exp?: number }): {
  token: string;
  payload: OpsEnterPayload;
} {
  const payload: OpsEnterPayload = {
    v: 1,
    jti: input.jti ?? randomUUID(),
    salonId: input.salonId,
    staffUserId: input.staffUserId,
    opsEmail: input.opsEmail.trim().toLowerCase(),
    companyName: input.companyName,
    next: input.next.startsWith('/') ? input.next : '/agenda',
    e: input.exp ?? Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', opsSupportSecret()).update(body).digest('base64url');
  return { token: `${body}.${sig}`, payload };
}

export function verifyOpsEnterToken(token: string, now = Date.now()): OpsEnterPayload | null {
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', opsSupportSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as OpsEnterPayload;
    if (payload.v !== 1 || !payload.jti || !payload.salonId || !payload.staffUserId) return null;
    if (!payload.opsEmail?.includes('@') || payload.e < now) return null;
    if (!payload.next.startsWith('/')) return null;
    return payload;
  } catch {
    return null;
  }
}

export type OpsSessionPayload = {
  salonId: string;
  staffUserId: string;
  opsEmail: string;
  companyName: string;
  e: number;
};

const SESSION_MS = 8 * 60 * 60 * 1000;

export function signOpsSession(input: Omit<OpsSessionPayload, 'e'> & { exp?: number }): string {
  const payload: OpsSessionPayload = {
    ...input,
    opsEmail: input.opsEmail.trim().toLowerCase(),
    e: input.exp ?? Date.now() + SESSION_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', opsSupportSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** Contexto Ops entre generateLink y /auth/callback (redirectTo sin query larga). */
export type OpsPendingPayload = {
  salonId: string;
  staffUserId: string;
  opsEmail: string;
  companyName: string;
  next: string;
  e: number;
};

const PENDING_MS = 10 * 60 * 1000;

export function signOpsPending(input: Omit<OpsPendingPayload, 'e'> & { exp?: number }): string {
  const payload: OpsPendingPayload = {
    ...input,
    opsEmail: input.opsEmail.trim().toLowerCase(),
    next: input.next.startsWith('/') ? input.next : '/agenda',
    e: input.exp ?? Date.now() + PENDING_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', opsSupportSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyOpsPending(token: string | undefined, now = Date.now()): OpsPendingPayload | null {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', opsSupportSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as OpsPendingPayload;
    if (!payload.salonId || !payload.staffUserId || !payload.opsEmail || payload.e < now) return null;
    if (!payload.next.startsWith('/')) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyOpsSession(token: string | undefined, now = Date.now()): OpsSessionPayload | null {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', opsSupportSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as OpsSessionPayload;
    if (!payload.salonId || !payload.opsEmail || payload.e < now) return null;
    return payload;
  } catch {
    return null;
  }
}
