import { panelAdmin } from '@/lib/supabase-admin';

const BREVO_API = 'https://api.brevo.com/v3';

function apiKey(): string | null {
  return process.env.BREVO_API_KEY?.trim() || null;
}

export type BrevoUsageSnapshot = {
  configured: boolean;
  error: string | null;
  accountEmail: string | null;
  companyName: string | null;
  planType: string | null;
  creditsRemaining: number | null;
  creditsType: string | null;
  relayEnabled: boolean | null;
  /** Tope diario conocido (free = 300). null si plan de pago / desconocido. */
  dailyLimit: number | null;
  /** Requests SMTP hoy (Brevo). */
  todayRequests: number | null;
  /** Entregados hoy (Brevo). */
  todayDelivered: number | null;
  /** Últimos 14 días requests (Brevo). */
  last14Requests: number | null;
  /** Contadores propios email_log (UTC hoy). */
  appSentToday: number;
  appFailedToday: number;
  appSentMonth: number;
  recent: Array<{
    id: string;
    kind: string;
    to_email: string;
    subject: string | null;
    status: string;
    created_at: string;
  }>;
};

function madridDayBoundsUtc(): { start: string; end: string; monthStart: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  // Aprox.: medianoche Madrid como UTC± (suficiente para cupos ops).
  const start = new Date(`${y}-${m}-${d}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(`${y}-${m}-01T00:00:00+01:00`);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    monthStart: monthStart.toISOString(),
  };
}

export async function loadBrevoUsage(): Promise<BrevoUsageSnapshot> {
  const empty: BrevoUsageSnapshot = {
    configured: false,
    error: null,
    accountEmail: null,
    companyName: null,
    planType: null,
    creditsRemaining: null,
    creditsType: null,
    relayEnabled: null,
    dailyLimit: null,
    todayRequests: null,
    todayDelivered: null,
    last14Requests: null,
    appSentToday: 0,
    appFailedToday: 0,
    appSentMonth: 0,
    recent: [],
  };

  const key = apiKey();
  if (!key) {
    return { ...empty, error: 'Falta BREVO_API_KEY en el panel' };
  }

  const snap: BrevoUsageSnapshot = { ...empty, configured: true };

  try {
    const [accRes, statsRes] = await Promise.all([
      fetch(`${BREVO_API}/account`, {
        headers: { 'api-key': key, Accept: 'application/json' },
        cache: 'no-store',
      }),
      fetch(`${BREVO_API}/smtp/statistics/reports?days=14&sort=desc`, {
        headers: { 'api-key': key, Accept: 'application/json' },
        cache: 'no-store',
      }),
    ]);

    if (accRes.ok) {
      const json = (await accRes.json()) as {
        email?: string;
        companyName?: string;
        plan?: Array<{ type?: string; credits?: number; creditsType?: string }>;
        relay?: { enabled?: boolean };
      };
      const plan = json.plan?.[0] ?? null;
      snap.accountEmail = json.email ?? null;
      snap.companyName = json.companyName ?? null;
      snap.planType = plan?.type ?? null;
      snap.creditsRemaining = typeof plan?.credits === 'number' ? plan.credits : null;
      snap.creditsType = plan?.creditsType ?? null;
      snap.relayEnabled = json.relay?.enabled ?? null;
      snap.dailyLimit = plan?.type === 'free' ? 300 : null;
    } else {
      snap.error = `Brevo account ${accRes.status}`;
    }

    if (statsRes.ok) {
      const json = (await statsRes.json()) as {
        reports?: Array<{ date: string; requests: number; delivered: number }>;
      };
      const reports = json.reports ?? [];
      const todayKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const today = reports.find(r => r.date === todayKey) ?? reports[0];
      // Si el primero es el más reciente (sort desc), úsalo como hoy si coincide.
      if (today) {
        snap.todayRequests = today.requests ?? 0;
        snap.todayDelivered = today.delivered ?? 0;
      }
      snap.last14Requests = reports.reduce((a, r) => a + (r.requests ?? 0), 0);
    } else if (!snap.error) {
      snap.error = `Brevo stats ${statsRes.status}`;
    }
  } catch (e) {
    snap.error = e instanceof Error ? e.message : 'Error Brevo';
  }

  const sb = panelAdmin();
  if (sb) {
    const { start, end, monthStart } = madridDayBoundsUtc();
    const [todaySent, todayFail, monthSent, recent] = await Promise.all([
      sb
        .from('email_log')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('created_at', start)
        .lt('created_at', end),
      sb
        .from('email_log')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', start)
        .lt('created_at', end),
      sb
        .from('email_log')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('created_at', monthStart),
      sb
        .from('email_log')
        .select('id, kind, to_email, subject, status, created_at')
        .order('created_at', { ascending: false })
        .limit(12),
    ]);
    snap.appSentToday = todaySent.count ?? 0;
    snap.appFailedToday = todayFail.count ?? 0;
    snap.appSentMonth = monthSent.count ?? 0;
    snap.recent = (recent.data ?? []) as BrevoUsageSnapshot['recent'];
  }

  return snap;
}
