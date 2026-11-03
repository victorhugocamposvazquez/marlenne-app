const BREVO_API = 'https://api.brevo.com/v3';

export function brevoApiKey(): string | null {
  return process.env.BREVO_API_KEY?.trim() || null;
}

export function parseMailFrom(raw: string): { name?: string; email: string } {
  const m = raw.trim().match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].replace(/^["']|["']$/g, '').trim(), email: m[2].trim() };
  return { email: raw.trim() };
}

export async function brevoSendTransactional(input: {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  tags?: string[];
}): Promise<{ ok: true; messageId: string | null } | { ok: false; error: string }> {
  const apiKey = brevoApiKey();
  if (!apiKey) return { ok: false, error: 'Falta BREVO_API_KEY' };

  const fromRaw = process.env.MAIL_FROM?.trim() || 'Marlén <avisos@marlen.app>';
  const sender = parseMailFrom(fromRaw);

  const res = await fetch(`${BREVO_API}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: sender.email,
        ...(sender.name ? { name: sender.name } : {}),
      },
      to: input.to.map(email => ({ email })),
      subject: input.subject,
      textContent: input.text,
      ...(input.html ? { htmlContent: input.html } : {}),
      ...(input.tags?.length ? { tags: input.tags } : {}),
    }),
  });

  const body = await res.text().catch(() => '');
  if (!res.ok) {
    return { ok: false, error: body || `Brevo ${res.status}` };
  }
  let messageId: string | null = null;
  try {
    const json = JSON.parse(body) as { messageId?: string };
    messageId = json.messageId ?? null;
  } catch {
    /* ignore */
  }
  return { ok: true, messageId };
}

export type BrevoAccountSnapshot = {
  email: string | null;
  companyName: string | null;
  planType: string | null;
  creditsRemaining: number | null;
  creditsType: string | null;
  relayEnabled: boolean | null;
};

export async function brevoGetAccount(): Promise<
  { ok: true; account: BrevoAccountSnapshot } | { ok: false; error: string }
> {
  const apiKey = brevoApiKey();
  if (!apiKey) return { ok: false, error: 'Falta BREVO_API_KEY' };

  const res = await fetch(`${BREVO_API}/account`, {
    headers: { 'api-key': apiKey, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, error: body || `Brevo account ${res.status}` };
  }
  const json = (await res.json()) as {
    email?: string;
    companyName?: string;
    plan?: Array<{ type?: string; credits?: number; creditsType?: string }>;
    relay?: { enabled?: boolean };
  };
  const plan = json.plan?.[0] ?? null;
  return {
    ok: true,
    account: {
      email: json.email ?? null,
      companyName: json.companyName ?? null,
      planType: plan?.type ?? null,
      creditsRemaining: typeof plan?.credits === 'number' ? plan.credits : null,
      creditsType: plan?.creditsType ?? null,
      relayEnabled: json.relay?.enabled ?? null,
    },
  };
}

export type BrevoDayReport = {
  date: string;
  requests: number;
  delivered: number;
  hardBounces: number;
  softBounces: number;
  blocked: number;
};

export async function brevoGetSmtpReports(days = 14): Promise<
  { ok: true; reports: BrevoDayReport[] } | { ok: false; error: string }
> {
  const apiKey = brevoApiKey();
  if (!apiKey) return { ok: false, error: 'Falta BREVO_API_KEY' };

  const q = new URLSearchParams({ days: String(Math.min(30, Math.max(1, days))), sort: 'desc' });
  const res = await fetch(`${BREVO_API}/smtp/statistics/reports?${q}`, {
    headers: { 'api-key': apiKey, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, error: body || `Brevo stats ${res.status}` };
  }
  const json = (await res.json()) as {
    reports?: Array<{
      date: string;
      requests: number;
      delivered: number;
      hardBounces: number;
      softBounces: number;
      blocked: number;
    }>;
  };
  return {
    ok: true,
    reports: (json.reports ?? []).map(r => ({
      date: r.date,
      requests: r.requests ?? 0,
      delivered: r.delivered ?? 0,
      hardBounces: r.hardBounces ?? 0,
      softBounces: r.softBounces ?? 0,
      blocked: r.blocked ?? 0,
    })),
  };
}
