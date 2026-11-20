import { createClient } from '@/lib/supabase/server';
import { chunkIds } from '@/lib/supabase/fetch-all';
import { toTimestamp, dateFromOffset, dayKey } from '@/lib/time';
import { packExpired, packRemaining } from '@/lib/packs';
import { fold } from '@/lib/voice';
import type { ClientListRow, ClientOption } from '@/lib/types';

import { CLIENT_LIST_PAGE } from '@/lib/client-list-size';

export { CLIENT_LIST_PAGE };

/** name_fold si la migración está; si no, el nombre tal cual. */
function applyNameSearch<Q extends {
  or: (filters: string) => Q;
  ilike: (column: string, pattern: string) => Q;
}>(query: Q, raw: string, useFold: boolean): Q {
  const digits = raw.replace(/\D/g, '');
  const name = (useFold ? fold(raw) : raw).replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
  const col = useFold ? 'name_fold' : 'full_name';
  if (digits.length >= 3 && name) return query.or(`${col}.ilike.%${name}%,phone.ilike.%${digits}%`);
  if (digits.length >= 3) return query.ilike('phone', `%${digits}%`);
  return query.ilike(col, `%${name}%`);
}

type RawClientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  tags: string[] | null;
  created_at: string;
};

const CLIENT_SELECT = 'id, full_name, phone, tags, created_at';

/** Una vez por proceso: la columna ya está o no. No se reintenta en cada tecla. */
let nameFoldReady: boolean | null = null;

async function usesNameFold(sb: ReturnType<typeof createClient>) {
  if (nameFoldReady !== null) return nameFoldReady;
  const { error } = await sb.from('clients').select('name_fold').limit(1);
  nameFoldReady = !error;
  return nameFoldReady;
}

type VisitStat = {
  client_id: string;
  next_at: string | null;
  last_at: string | null;
  visit_count: number;
};

function missingStats(message: string | undefined) {
  return !!message && /client_list_stats|PGRST202|schema cache/i.test(message);
}

async function loadVisitStats(
  sb: ReturnType<typeof createClient>,
  ids: string[],
  since: string,
): Promise<VisitStat[]> {
  const stats: VisitStat[] = [];
  for (const chunk of chunkIds(ids, 80)) {
    const { data, error } = await sb.rpc('client_list_stats', { p_ids: chunk, p_since: since });
    if (missingStats(error?.message)) return loadVisitStatsLegacy(sb, ids, since);
    if (error || !data) continue;
    stats.push(...(data as VisitStat[]));
  }
  return stats;
}

async function loadVisitStatsLegacy(
  sb: ReturnType<typeof createClient>,
  ids: string[],
  since: string,
): Promise<VisitStat[]> {
  const now = new Date().toISOString();
  const nextBy = new Map<string, string>();
  const lastBy = new Map<string, string>();
  const visitsBy = new Map<string, number>();
  for (const chunk of chunkIds(ids)) {
    const [{ data: up }, { data: done }] = await Promise.all([
      sb.from('appointments')
        .select('client_id, starts_at')
        .in('client_id', chunk)
        .in('status', ['prog', 'curso'])
        .gte('starts_at', now)
        .order('starts_at'),
      sb.from('appointments')
        .select('client_id, starts_at')
        .in('client_id', chunk)
        .eq('status', 'done')
        .gte('starts_at', since)
        .lt('starts_at', now)
        .order('starts_at', { ascending: false }),
    ]);
    for (const a of up ?? []) {
      if (a.client_id && !nextBy.has(a.client_id)) nextBy.set(a.client_id, a.starts_at);
    }
    for (const a of done ?? []) {
      if (!a.client_id) continue;
      visitsBy.set(a.client_id, (visitsBy.get(a.client_id) ?? 0) + 1);
      if (!lastBy.has(a.client_id)) lastBy.set(a.client_id, a.starts_at);
    }
  }
  return ids.map(id => ({
    client_id: id,
    next_at: nextBy.get(id) ?? null,
    last_at: lastBy.get(id) ?? null,
    visit_count: visitsBy.get(id) ?? 0,
  }));
}

async function enrichClientRows(rows: RawClientRow[]): Promise<ClientListRow[]> {
  if (!rows.length) return [];
  const sb = createClient();
  const ids = rows.map(c => c.id);
  const idSet = new Set(ids);
  const since = toTimestamp(dateFromOffset(-400), 0);
  const today = dayKey(new Date());

  const packsBy = new Map<string, string[]>();
  const treatmentsBy = new Map<string, string[]>();
  const nextBy = new Map<string, string | null>();
  const lastBy = new Map<string, string | null>();
  const visitsBy = new Map<string, number>();

  const packRows: {
    name: string;
    sessions_done: number;
    sessions_total: number;
    expires_at: string | null;
    owner_client_id: string | null;
    friend_client_id: string | null;
  }[] = [];

  async function loadPacks() {
    for (const chunk of chunkIds(ids, 80)) {
      const list = chunk.join(',');
      const { data, error } = await sb
        .from('client_packs')
        .select('name, sessions_done, sessions_total, expires_at, owner_client_id, friend_client_id')
        .or(`owner_client_id.in.(${list}),friend_client_id.in.(${list})`);
      if (error) break;
      packRows.push(...(data ?? []));
    }
  }

  async function loadOpenTreatments() {
    for (const chunk of chunkIds(ids, 80)) {
      const { data, error } = await sb
        .from('treatments')
        .select('client_id, service:services(name)')
        .in('client_id', chunk)
        .is('closed_at', null);
      if (error || !data) continue;
      for (const row of data) {
        const name = (row.service as { name?: string } | null)?.name;
        if (!name || !row.client_id) continue;
        const list = treatmentsBy.get(row.client_id) ?? [];
        list.push(name);
        treatmentsBy.set(row.client_id, list);
      }
    }
  }

  const [stats] = await Promise.all([
    loadVisitStats(sb, ids, since),
    loadPacks(),
    loadOpenTreatments(),
  ]);

  for (const s of stats) {
    nextBy.set(s.client_id, s.next_at);
    lastBy.set(s.client_id, s.last_at);
    visitsBy.set(s.client_id, s.visit_count ?? 0);
  }
  for (const p of packRows) {
    if (packExpired(p.expires_at, today)) continue;
    if (packRemaining(p) <= 0) continue;
    const label = `${p.name} ${packRemaining(p)}/${p.sessions_total}`;
    for (const cid of [p.owner_client_id, p.friend_client_id]) {
      if (!cid || !idSet.has(cid)) continue;
      const list = packsBy.get(cid) ?? [];
      list.push(label);
      packsBy.set(cid, list);
    }
  }

  return rows.map(c => ({
    id: c.id,
    full_name: c.full_name,
    phone: c.phone,
    tags: c.tags ?? [],
    open_treatments: treatmentsBy.get(c.id) ?? [],
    open_packs: packsBy.get(c.id) ?? [],
    next_at: nextBy.get(c.id) ?? null,
    last_at: lastBy.get(c.id) ?? null,
    created_at: c.created_at,
    visit_count: visitsBy.get(c.id) ?? 0,
  }));
}

export async function listClientsPage(
  offset: number,
  limit: number,
): Promise<{ rows: ClientListRow[]; total: number }> {
  const sb = createClient();
  const { data, count, error } = await sb
    .from('clients')
    .select(CLIENT_SELECT, { count: 'exact' })
    .order('full_name')
    .range(offset, offset + limit - 1);
  if (error || !data?.length) return { rows: [], total: count ?? 0 };
  const rows = await enrichClientRows(data as unknown as RawClientRow[]);
  return { rows, total: count ?? rows.length };
}

/** Búsqueda por nombre o teléfono (paginada). El conteo exacto va aparte, al dejar de escribir. */
export async function searchClientsPage(
  query: string,
  offset: number,
  limit: number,
): Promise<{ rows: ClientListRow[]; total: number | null }> {
  const q = query.trim();
  if (q.length < 2) return { rows: [], total: 0 };
  const sb = createClient();
  const useFold = await usesNameFold(sb);
  const { data, error } = await applyNameSearch(
    sb.from('clients').select(CLIENT_SELECT),
    q,
    useFold,
  ).order('full_name').range(offset, offset + limit - 1);
  if (error || !data?.length) return { rows: [], total: error ? null : 0 };
  const rows = await enrichClientRows(data as unknown as RawClientRow[]);
  return { rows, total: null };
}

/** Cuántas clientas coinciden. Se pide cuando la búsqueda ya está quieta. */
export async function countClientsSearch(query: string): Promise<number | null> {
  const q = query.trim();
  if (q.length < 2) return 0;
  const sb = createClient();
  const useFold = await usesNameFold(sb);
  const { count, error } = await applyNameSearch(
    sb.from('clients').select('id', { count: 'exact', head: true }),
    q,
    useFold,
  );
  if (error) return null;
  return count ?? 0;
}

const PICKER_SELECT = 'id, full_name, phone';

function mapPickerRows(data: { id: string; full_name: string; phone: string | null }[]): ClientOption[] {
  return data.map(r => ({
    id: r.id,
    full_name: r.full_name,
    phone: r.phone ?? null,
  }));
}

/** Primeras clientas alfabéticas (picker nueva cita / editar sin cargar toda la BD). */
export async function listClientPickerInitial(limit = 40): Promise<ClientOption[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('clients')
    .select(PICKER_SELECT)
    .order('full_name')
    .limit(limit);
  if (error || !data?.length) return [];
  return mapPickerRows(data as { id: string; full_name: string; phone: string | null }[]);
}

/** Búsqueda ligera para el picker de nueva cita (sin enriquecer citas/bonos). */
export async function searchClientPicker(query: string, limit = 40): Promise<ClientOption[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const sb = createClient();
  const useFold = await usesNameFold(sb);
  const { data, error } = await applyNameSearch(
    sb.from('clients').select(PICKER_SELECT).limit(limit),
    q,
    useFold,
  ).order('full_name');
  if (error || !data) return [];
  return (data ?? []).map(r => ({
    id: r.id as string,
    full_name: r.full_name as string,
    phone: (r.phone as string | null) ?? null,
  }));
}

export async function getClientPickerOption(id: string): Promise<ClientOption | null> {
  const sb = createClient();
  const { data } = await sb.from('clients').select('id, full_name, phone').eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    full_name: data.full_name as string,
    phone: (data.phone as string | null) ?? null,
  };
}

export async function findSimilarClients(name: string, phone: string): Promise<ClientOption[]> {
  const sb = createClient();
  const tel = phone.replace(/\D/g, '');
  if (fold(name).length < 3 && tel.length < 6) return [];
  const useFold = await usesNameFold(sb);

  let builder = sb.from('clients').select('id, full_name, phone').limit(8);
  const folded = useFold ? fold(name) : name.trim();
  const safe = folded.replace(/[%_,]/g, ' ').trim();
  if (safe.length >= 3 && tel.length >= 6) {
    const col = useFold ? 'name_fold' : 'full_name';
    builder = builder.or(`${col}.ilike.%${safe}%,phone.ilike.%${tel.slice(-9)}%`);
  } else if (safe.length >= 3) {
    builder = builder.ilike(useFold ? 'name_fold' : 'full_name', `%${safe}%`);
  } else {
    builder = builder.ilike('phone', `%${tel.slice(-9)}%`);
  }
  const { data } = await builder;
  return (data ?? []).map(r => ({
    id: r.id as string,
    full_name: r.full_name as string,
    phone: (r.phone as string | null) ?? null,
  }));
}
