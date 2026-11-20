import { createClient } from '@/lib/supabase/server';
import { chunkIds } from '@/lib/supabase/fetch-all';
import { toTimestamp, dateFromOffset, dayKey } from '@/lib/time';
import { packExpired, packRemaining } from '@/lib/packs';
import { fold } from '@/lib/voice';
import type { ClientListRow, ClientOption } from '@/lib/types';

export const CLIENT_LIST_PAGE = 40;

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

function missingFold(message: string | undefined) {
  return !!message && /name_fold/i.test(message);
}

type RawClientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  tags: string[] | null;
  created_at: string;
  treatments?: { service?: { name: string } | null; closed_at: string | null }[];
};

const CLIENT_SELECT = 'id, full_name, phone, tags, created_at, treatments(service:services(name), closed_at)';

async function enrichClientRows(rows: RawClientRow[]): Promise<ClientListRow[]> {
  if (!rows.length) return [];
  const sb = createClient();
  const ids = rows.map(c => c.id);

  const nextBy = new Map<string, string>();
  const lastBy = new Map<string, string>();
  const visitsBy = new Map<string, number>();
  const packsBy = new Map<string, string[]>();

  const now = new Date().toISOString();
  const today = dayKey(new Date());
  const upcoming: { client_id: string | null; starts_at: string }[] = [];
  const past: { client_id: string | null; starts_at: string }[] = [];

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
        .gte('starts_at', toTimestamp(dateFromOffset(-400), 0))
        .lt('starts_at', now)
        .order('starts_at', { ascending: false }),
    ]);
    upcoming.push(...(up ?? []));
    past.push(...(done ?? []));
  }

  const idSet = new Set(ids);
  const packRows: {
    name: string;
    sessions_done: number;
    sessions_total: number;
    expires_at: string | null;
    owner_client_id: string | null;
    friend_client_id: string | null;
  }[] = [];
  for (const chunk of chunkIds(ids, 80)) {
    const list = chunk.join(',');
    const { data, error } = await sb
      .from('client_packs')
      .select('name, sessions_done, sessions_total, expires_at, owner_client_id, friend_client_id')
      .or(`owner_client_id.in.(${list}),friend_client_id.in.(${list})`);
    if (error) break;
    packRows.push(...(data ?? []));
  }
  const packsRes = { error: null, data: packRows };

  for (const a of upcoming) {
    if (a.client_id && !nextBy.has(a.client_id)) nextBy.set(a.client_id, a.starts_at);
  }
  for (const a of past) {
    if (!a.client_id) continue;
    visitsBy.set(a.client_id, (visitsBy.get(a.client_id) ?? 0) + 1);
    if (!lastBy.has(a.client_id)) lastBy.set(a.client_id, a.starts_at);
  }
  if (!packsRes.error) {
    for (const p of packsRes.data ?? []) {
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
  }

  return rows.map(c => ({
    id: c.id,
    full_name: c.full_name,
    phone: c.phone,
    tags: c.tags ?? [],
    open_treatments: (c.treatments ?? [])
      .filter(t => !t.closed_at)
      .map(t => t.service?.name)
      .filter((n): n is string => !!n),
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

/** Búsqueda por nombre o teléfono (paginada). */
export async function searchClientsPage(
  query: string,
  offset: number,
  limit: number,
): Promise<{ rows: ClientListRow[]; total: number }> {
  const q = query.trim();
  if (q.length < 2) return { rows: [], total: 0 };
  const sb = createClient();
  const run = (useFold: boolean) => {
    const builder = applyNameSearch(
      sb.from('clients').select(CLIENT_SELECT, { count: 'exact' }),
      q,
      useFold,
    );
    return builder.order('full_name').range(offset, offset + limit - 1);
  };
  let { data, count, error } = await run(true);
  if (missingFold(error?.message)) ({ data, count, error } = await run(false));
  if (error || !data?.length) return { rows: [], total: count ?? 0 };
  const rows = await enrichClientRows(data as unknown as RawClientRow[]);
  return { rows, total: count ?? rows.length };
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
  const run = (useFold: boolean) => applyNameSearch(
    sb.from('clients').select(PICKER_SELECT).limit(limit),
    q,
    useFold,
  ).order('full_name');
  let { data, error } = await run(true);
  if (missingFold(error?.message)) ({ data, error } = await run(false));
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

  const run = (useFold: boolean) => {
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
    return builder;
  };
  let { data, error } = await run(true);
  if (missingFold(error?.message)) ({ data } = await run(false));
  return (data ?? []).map(r => ({
    id: r.id as string,
    full_name: r.full_name as string,
    phone: (r.phone as string | null) ?? null,
  }));
}
