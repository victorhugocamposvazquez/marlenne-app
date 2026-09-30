import type { SupabaseClient } from '@supabase/supabase-js';
import {
  APPT_SELECT,
  APPT_SELECT_CORE,
  APPT_SELECT_PAID,
  mapAppt,
} from '@/lib/agenda-appt';
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

const PACK_SELECT_FULL = `
  id, name, price_cents, paid_cents, purchased_at, owner_client_id, salon_id,
  owner:clients!owner_client_id(full_name)
`;
const PACK_SELECT_LEGACY = `
  id, name, price_cents, purchased_at, owner_client_id, salon_id,
  owner:clients!owner_client_id(full_name)
`;
const PACK_SELECT_PLAIN = `
  id, name, price_cents, purchased_at, owner_client_id, salon_id
`;

const APPT_SELECT_MIN = `
  id, starts_at, price_cents, paid_cents, status, client_id, client_name, service_id, provider_id
`;
const APPT_SELECT_MIN_PLAIN = `
  id, starts_at, price_cents, status, client_id, client_name, service_id, provider_id
`;

export type FinanzasLoadResult = {
  movs: FinanzasMov[];
  /** Mensaje si la query falló (no por periodo vacío). */
  warning: string | null;
};

type Row = Record<string, unknown>;

async function fetchRows(
  run: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<{ rows: Row[]; error: string | null }> {
  const res = await run();
  if (!res.error) return { rows: (res.data as Row[] | null) ?? [], error: null };
  return { rows: [], error: res.error.message };
}

/** Carga citas y bonos del salón en un rango amplio (filtro fino en UI).
 *  Misma estrategia de select/fallback que la agenda, que sí lee prod. */
export async function loadFinanzasMovements(
  sb: SupabaseClient,
  opts?: { from?: string; to?: string; salonId?: string },
): Promise<FinanzasLoadResult> {
  const now = new Date();
  const year = now.getFullYear();
  const from = opts?.from ?? `${year - 1}-01-01`;
  const to = opts?.to ?? `${year + 1}-12-31`;
  const fromTs = toTimestamp(from, 0);
  const toTs = toTimestamp(to, 24 * 60 - 1);
  const salonId = opts?.salonId;

  const loadAppts = (cols: string) => {
    let q = sb
      .from('appointments')
      .select(cols)
      .gte('starts_at', fromTs)
      .lte('starts_at', toTs)
      .order('starts_at', { ascending: false })
      .limit(2000);
    if (salonId) q = q.eq('salon_id', salonId);
    return q;
  };

  const loadPacks = (cols: string) => {
    let q = sb
      .from('client_packs')
      .select(cols)
      .gte('purchased_at', from)
      .lte('purchased_at', to)
      .order('purchased_at', { ascending: false })
      .limit(1000);
    if (salonId) q = q.eq('salon_id', salonId);
    return q;
  };

  let appt = await fetchRows(() => loadAppts(APPT_SELECT));
  if (appt.error) {
    const msg = appt.error;
    if (/payment_split/i.test(msg)) appt = await fetchRows(() => loadAppts(APPT_SELECT_PAID));
    if (appt.error && /confirmed_at|client_pack|color|paid_cents|payment_method|payment_split/i.test(msg + appt.error)) {
      appt = await fetchRows(() => loadAppts(APPT_SELECT_CORE));
    }
    if (appt.error) {
      appt = await fetchRows(() => loadAppts(APPT_SELECT_MIN));
      if (appt.error && /paid_cents/i.test(appt.error)) {
        const plain = await fetchRows(() => loadAppts(APPT_SELECT_MIN_PLAIN));
        appt = {
          rows: plain.rows.map(r => ({ ...r, paid_cents: 0 })),
          error: plain.error,
        };
      }
    }
    if (appt.error) console.error('[finanzas] appointments', appt.error);
  }

  let packs = await fetchRows(() => loadPacks(PACK_SELECT_FULL));
  if (packs.error) {
    if (/paid_cents|payment_method|payment_split/i.test(packs.error)) {
      packs = await fetchRows(() => loadPacks(PACK_SELECT_LEGACY));
    }
    if (packs.error) packs = await fetchRows(() => loadPacks(PACK_SELECT_PLAIN));
    if (packs.error) console.error('[finanzas] packs', packs.error);
  }

  const movs: FinanzasMov[] = [];

  for (const row of appt.rows) {
    try {
      const a = mapAppt(row);
      const who = a.provider_name?.split(' ')[0];
      const svc = a.service_name || 'Cita';
      movs.push({
        id: `cita:${a.id}`,
        kind: 'cita',
        sourceId: a.id,
        clientId: a.client_id,
        clientLabel: a.client_label,
        concept: who ? `${svc} · con ${who}` : svc,
        amountCents: Math.max(0, a.price_cents ?? 0),
        paidCents: Math.max(0, a.paid_cents ?? 0),
        at: a.starts_at,
      });
    } catch {
      movs.push({
        id: `cita:${String(row.id)}`,
        kind: 'cita',
        sourceId: String(row.id),
        clientId: (row.client_id as string | null) ?? null,
        clientLabel: (row.client_name as string | null) ?? 'Sin nombre',
        concept: 'Cita',
        amountCents: Math.max(0, Number(row.price_cents ?? 0)),
        paidCents: Math.max(0, Number(row.paid_cents ?? 0)),
        at: String(row.starts_at),
      });
    }
  }

  for (const row of packs.rows) {
    const purchased = String(row.purchased_at ?? '');
    const at = purchased.length <= 10 ? `${purchased}T12:00:00` : purchased;
    const owner = row.owner as { full_name?: string } | null | undefined;
    movs.push({
      id: `bono:${String(row.id)}`,
      kind: 'bono',
      sourceId: String(row.id),
      clientId: String(row.owner_client_id),
      clientLabel: owner?.full_name ?? 'Sin nombre',
      concept: String(row.name ?? 'Bono'),
      amountCents: Math.max(0, Number(row.price_cents ?? 0)),
      paidCents: Math.max(0, Number(row.paid_cents ?? 0)),
      at,
    });
  }

  movs.sort((a, b) => dayNumFromIso(b.at) - dayNumFromIso(a.at) || b.id.localeCompare(a.id));

  let warning: string | null = null;
  if (appt.error && packs.error) {
    warning = `No se han podido cargar citas ni bonos (${appt.error})`;
  } else if (appt.error) {
    warning = `Citas: error al leer la base (${appt.error}). Bonos: ${packs.rows.length}.`;
  } else if (packs.error) {
    warning = `Bonos: error al leer la base (${packs.error}). Citas: ${appt.rows.length}.`;
  }

  return { movs, warning };
}

export async function loadFinanzasClients(
  sb: SupabaseClient,
  salonId?: string,
): Promise<FinanzasClient[]> {
  let q = sb.from('clients').select('id, full_name, phone').order('full_name').limit(500);
  if (salonId) q = q.eq('salon_id', salonId);
  const { data, error } = await q;
  if (error) {
    console.error('[finanzas] clients', error.message);
    return [];
  }
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
