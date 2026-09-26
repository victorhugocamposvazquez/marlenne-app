import { createClient } from '@/lib/supabase/server';
import { chunkIds } from '@/lib/supabase/fetch-all';
import { toTimestamp, dateFromOffset, dayKey } from '@/lib/time';
import { packExpired, packRemaining } from '@/lib/packs';
import type { ClientListRow, ClientOption } from '@/lib/types';

export const CLIENT_LIST_PAGE = 40;

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
  const packsRes = await sb
    .from('client_packs')
    .select('name, sessions_done, sessions_total, expires_at, owner_client_id, friend_client_id');

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
  const digits = q.replace(/\D/g, '');
  const safe = q.replace(/[%_,]/g, ' ').trim();
  let builder = sb.from('clients').select(CLIENT_SELECT, { count: 'exact' });
  if (digits.length >= 3) {
    builder = builder.or(`full_name.ilike.%${safe}%,phone.ilike.%${digits}%`);
  } else {
    builder = builder.ilike('full_name', `%${safe}%`);
  }
  const { data, count, error } = await builder.order('full_name').range(offset, offset + limit - 1);
  if (error || !data?.length) return { rows: [], total: count ?? 0 };
  const rows = await enrichClientRows(data as unknown as RawClientRow[]);
  return { rows, total: count ?? rows.length };
}

export async function findSimilarClients(name: string, phone: string): Promise<ClientOption[]> {
  const sb = createClient();
  const folded = name.trim();
  const tel = phone.replace(/\D/g, '');
  if (folded.length < 3 && tel.length < 6) return [];

  let builder = sb.from('clients').select('id, full_name, phone').limit(8);
  if (folded.length >= 3 && tel.length >= 6) {
    builder = builder.or(`full_name.ilike.%${folded.replace(/[%_,]/g, ' ')}%,phone.ilike.%${tel.slice(-9)}%`);
  } else if (folded.length >= 3) {
    builder = builder.ilike('full_name', `%${folded.replace(/[%_,]/g, ' ')}%`);
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
