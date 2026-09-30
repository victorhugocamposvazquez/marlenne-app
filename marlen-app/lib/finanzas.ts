import type { SupabaseClient } from '@supabase/supabase-js';
import { owedCents } from '@/lib/payment';
import { toTimestamp, TZ } from '@/lib/time';

export type FinanzasKind = 'cita' | 'bono' | 'fact';

export type FinanzasMov = {
  id: string;
  kind: FinanzasKind;
  sourceId: string;
  clientId: string | null;
  clientLabel: string;
  concept: string;
  amountCents: number;
  paidCents: number;
  /** ISO timestamp or YYYY-MM-DD */
  at: string;
  num?: string;
  nif?: string;
  dir?: string;
};

export type FinanzasClient = {
  id: string;
  name: string;
  phone: string | null;
};

export function movPaid(m: FinanzasMov): boolean {
  if (m.kind === 'fact') return true;
  if (m.amountCents > 0) return m.paidCents >= m.amountCents;
  return m.paidCents > 0;
}

export function movOwedCents(m: FinanzasMov): number {
  if (m.kind === 'fact') return 0;
  return owedCents(m.amountCents, m.paidCents);
}

/** Día civil Madrid → YYYYMMDD numérico para rangos. */
export function dayNumFromIso(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso.includes('T') ? iso : `${iso}T12:00:00`));
  const y = Number(parts.find(p => p.type === 'year')?.value ?? 0);
  const m = Number(parts.find(p => p.type === 'month')?.value ?? 1);
  const d = Number(parts.find(p => p.type === 'day')?.value ?? 1);
  return y * 10000 + m * 100 + d;
}

export function dayNumFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

export function monthIndexFromIso(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, month: '2-digit',
  }).formatToParts(new Date(iso.includes('T') ? iso : `${iso}T12:00:00`));
  return Number(parts.find(p => p.type === 'month')?.value ?? 1) - 1;
}

export function dayOfMonthFromIso(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, day: '2-digit',
  }).formatToParts(new Date(iso.includes('T') ? iso : `${iso}T12:00:00`));
  return Number(parts.find(p => p.type === 'day')?.value ?? 1);
}

export function yearFromIso(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric',
  }).formatToParts(new Date(iso.includes('T') ? iso : `${iso}T12:00:00`));
  return Number(parts.find(p => p.type === 'year')?.value ?? 0);
}

const APPT_SELECT_PAID = `
  id, starts_at, price_cents, paid_cents, status, client_id, client_name,
  service:services(name),
  provider:staff!appointments_provider_id_fkey(full_name),
  client:clients(full_name)
`;
const APPT_SELECT_PLAIN = `
  id, starts_at, price_cents, status, client_id, client_name,
  service:services(name),
  provider:staff!appointments_provider_id_fkey(full_name),
  client:clients(full_name)
`;
const PACK_SELECT_PAID = `
  id, name, price_cents, paid_cents, purchased_at, owner_client_id,
  owner:clients!owner_client_id(full_name)
`;
const PACK_SELECT_PLAIN = `
  id, name, price_cents, purchased_at, owner_client_id,
  owner:clients!owner_client_id(full_name)
`;

/** Carga citas y bonos del salón en un rango amplio (filtro fino en UI).
 *  Las canceladas se borran: no hay status `cancel` en el enum. */
export async function loadFinanzasMovements(
  sb: SupabaseClient,
  opts?: { from?: string; to?: string },
): Promise<FinanzasMov[]> {
  const now = new Date();
  const year = now.getFullYear();
  const from = opts?.from ?? `${year - 1}-01-01`;
  const to = opts?.to ?? `${year + 1}-12-31`;
  const fromTs = toTimestamp(from, 0);
  const toTs = toTimestamp(to, 24 * 60 - 1);

  const [apptsRes, packsRes] = await Promise.all([
    sb
      .from('appointments')
      .select(APPT_SELECT_PAID)
      .gte('starts_at', fromTs)
      .lte('starts_at', toTs)
      .order('starts_at', { ascending: false })
      .limit(2000),
    sb
      .from('client_packs')
      .select(PACK_SELECT_PAID)
      .gte('purchased_at', from)
      .lte('purchased_at', to)
      .order('purchased_at', { ascending: false })
      .limit(1000),
  ]);

  let apptRows = apptsRes.data;
  if (apptsRes.error) {
    if (/paid_cents/i.test(apptsRes.error.message)) {
      const retry = await sb
        .from('appointments')
        .select(APPT_SELECT_PLAIN)
        .gte('starts_at', fromTs)
        .lte('starts_at', toTs)
        .order('starts_at', { ascending: false })
        .limit(2000);
      apptRows = (retry.data ?? []).map(r => ({ ...r, paid_cents: 0 }));
      if (retry.error) console.error('[finanzas] appointments', retry.error.message);
    } else {
      console.error('[finanzas] appointments', apptsRes.error.message);
      apptRows = [];
    }
  }

  let packRows = packsRes.data;
  if (packsRes.error) {
    if (/paid_cents/i.test(packsRes.error.message)) {
      const retry = await sb
        .from('client_packs')
        .select(PACK_SELECT_PLAIN)
        .gte('purchased_at', from)
        .lte('purchased_at', to)
        .order('purchased_at', { ascending: false })
        .limit(1000);
      packRows = (retry.data ?? []).map(r => ({ ...r, paid_cents: 0 }));
      if (retry.error) console.error('[finanzas] packs', retry.error.message);
    } else {
      console.error('[finanzas] packs', packsRes.error.message);
      packRows = [];
    }
  }

  const movs: FinanzasMov[] = [];

  for (const row of apptRows ?? []) {
    const r = row as {
      id: string;
      starts_at: string;
      price_cents: number | null;
      paid_cents?: number | null;
      client_id: string | null;
      client_name: string | null;
      service?: { name?: string } | null;
      provider?: { full_name?: string } | null;
      client?: { full_name?: string } | null;
    };
    const svc = r.service?.name ?? 'Cita';
    const who = r.provider?.full_name?.split(' ')[0];
    movs.push({
      id: `cita:${r.id}`,
      kind: 'cita',
      sourceId: r.id,
      clientId: r.client_id,
      clientLabel: r.client?.full_name ?? r.client_name ?? 'Sin nombre',
      concept: who ? `${svc} · con ${who}` : svc,
      amountCents: Math.max(0, r.price_cents ?? 0),
      paidCents: Math.max(0, r.paid_cents ?? 0),
      at: r.starts_at,
    });
  }

  for (const row of packRows ?? []) {
    const r = row as {
      id: string;
      name: string;
      price_cents: number | null;
      paid_cents?: number | null;
      purchased_at: string;
      owner_client_id: string;
      owner?: { full_name?: string } | null;
    };
    movs.push({
      id: `bono:${r.id}`,
      kind: 'bono',
      sourceId: r.id,
      clientId: r.owner_client_id,
      clientLabel: r.owner?.full_name ?? 'Sin nombre',
      concept: r.name,
      amountCents: Math.max(0, r.price_cents ?? 0),
      paidCents: Math.max(0, r.paid_cents ?? 0),
      at: r.purchased_at.length <= 10 ? `${r.purchased_at}T12:00:00` : r.purchased_at,
    });
  }

  movs.sort((a, b) => dayNumFromIso(b.at) - dayNumFromIso(a.at) || b.id.localeCompare(a.id));
  return movs;
}

export async function loadFinanzasClients(sb: SupabaseClient): Promise<FinanzasClient[]> {
  const { data } = await sb
    .from('clients')
    .select('id, full_name, phone')
    .order('full_name')
    .limit(500);
  return (data ?? []).map(c => ({
    id: c.id as string,
    name: c.full_name as string,
    phone: (c.phone as string | null) ?? null,
  }));
}

export function defaultFinanzasRange(): { from: string; to: string } {
  const y = new Date().getFullYear();
  // Hasta fin del año siguiente: el filtro fino (mes/trimestre) es en UI.
  return { from: `${y - 1}-01-01`, to: `${y + 1}-12-31` };
}
