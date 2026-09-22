import type { SupabaseClient } from '@supabase/supabase-js';
import { attachReserved } from '@/lib/packs';
import { addDays, dayKey } from '@/lib/time';
import type { ClientPack, PackTemplate } from '@/lib/types';

export type PackWriteResult = { ok: boolean; error: string | null; id?: string };

async function salonOf(sb: SupabaseClient) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, salonId: null as string | null };
  const { data } = await sb.from('staff').select('salon_id').eq('id', user.id).maybeSingle();
  return { user, salonId: data?.salon_id ?? null };
}

const PACK_SELECT = `
  id, name, service_id, owner_client_id, friend_client_id,
  sessions_total, sessions_done, price_cents, purchased_at, expires_at, note, template_id,
  service:services(name),
  owner:clients!owner_client_id(full_name),
  friend:clients!friend_client_id(full_name)
`;

const PACK_SELECT_PLAIN = `
  id, name, service_id, owner_client_id, friend_client_id,
  sessions_total, sessions_done, price_cents, purchased_at, expires_at, note, template_id
`;

function mapPackRow(row: Record<string, unknown>): Omit<ClientPack, 'reserved' | 'remaining'> {
  const owner = row.owner as { full_name?: string } | null;
  const friend = row.friend as { full_name?: string } | null;
  const service = row.service as { name?: string } | null;
  return {
    id: row.id as string,
    name: row.name as string,
    service_id: (row.service_id as string | null) ?? null,
    service_name: service?.name ?? null,
    owner_client_id: row.owner_client_id as string,
    owner_name: owner?.full_name ?? '',
    friend_client_id: (row.friend_client_id as string | null) ?? null,
    friend_name: friend?.full_name ?? null,
    sessions_total: row.sessions_total as number,
    sessions_done: row.sessions_done as number,
    price_cents: row.price_cents as number,
    purchased_at: row.purchased_at as string,
    expires_at: (row.expires_at as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    template_id: (row.template_id as string | null) ?? null,
  };
}

async function reservedByPack(sb: SupabaseClient, ids: string[]) {
  const map = new Map<string, number>();
  if (!ids.length) return map;
  const { data } = await sb
    .from('appointments')
    .select('client_pack_id')
    .in('client_pack_id', ids)
    .in('status', ['prog', 'curso']);
  for (const row of data ?? []) {
    if (!row.client_pack_id) continue;
    map.set(row.client_pack_id, (map.get(row.client_pack_id) ?? 0) + 1);
  }
  return map;
}

export async function listPackTemplates(
  sb: SupabaseClient,
  opts?: { includeInactive?: boolean },
): Promise<PackTemplate[]> {
  let q = sb
    .from('pack_templates')
    .select('id, name, service_id, sessions_total, price_cents, valid_days, is_active, sort_order, service:services(name)')
    .order('sort_order')
    .order('name');
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  const rows = error
    ? ((await (opts?.includeInactive
      ? sb.from('pack_templates').select('id, name, service_id, sessions_total, price_cents, valid_days, is_active, sort_order').order('sort_order').order('name')
      : sb.from('pack_templates').select('id, name, service_id, sessions_total, price_cents, valid_days, is_active, sort_order').eq('is_active', true).order('sort_order').order('name')
    )).data ?? [])
    : (data ?? []);
  return rows.map(row => {
    const service = (row as { service?: { name?: string } | null }).service;
    return {
      id: row.id,
      name: row.name,
      service_id: row.service_id,
      service_name: service?.name ?? null,
      sessions_total: row.sessions_total,
      price_cents: row.price_cents,
      valid_days: row.valid_days,
      is_active: row.is_active,
      sort_order: row.sort_order,
    };
  });
}

export async function listClientPacks(sb: SupabaseClient, clientId: string): Promise<ClientPack[]> {
  const primary = await sb
    .from('client_packs')
    .select(PACK_SELECT)
    .or(`owner_client_id.eq.${clientId},friend_client_id.eq.${clientId}`)
    .order('purchased_at', { ascending: false });
  const raw = primary.error
    ? (await sb.from('client_packs').select(PACK_SELECT_PLAIN)
      .or(`owner_client_id.eq.${clientId},friend_client_id.eq.${clientId}`)
      .order('purchased_at', { ascending: false })).data
    : primary.data;
  const rows = (raw ?? []).map(r => mapPackRow(r as Record<string, unknown>));
  const reserved = await reservedByPack(sb, rows.map(r => r.id));
  return attachReserved(rows, reserved);
}

export async function listSalonPacks(sb: SupabaseClient): Promise<ClientPack[]> {
  const primary = await sb
    .from('client_packs')
    .select(PACK_SELECT)
    .order('purchased_at', { ascending: false });
  const raw = primary.error
    ? (await sb.from('client_packs').select(PACK_SELECT_PLAIN).order('purchased_at', { ascending: false })).data
    : primary.data;
  const rows = (raw ?? []).map(r => mapPackRow(r as Record<string, unknown>));
  const reserved = await reservedByPack(sb, rows.map(r => r.id));
  return attachReserved(rows, reserved);
}

export async function upsertPackTemplate(
  sb: SupabaseClient,
  input: {
    id?: string;
    name: string;
    service_id: string | null;
    sessions_total: number;
    price_cents: number;
    valid_days: number | null;
    is_active?: boolean;
  },
): Promise<PackWriteResult> {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: 'Pon un nombre al bono' };
  if (input.sessions_total < 1) return { ok: false, error: 'Pon al menos una sesión' };
  if (input.price_cents < 0) return { ok: false, error: 'Precio no válido' };
  const { salonId } = await salonOf(sb);
  if (!salonId) return { ok: false, error: 'Sin sesión' };

  const payload = {
    salon_id: salonId,
    name,
    service_id: input.service_id,
    sessions_total: input.sessions_total,
    price_cents: input.price_cents,
    valid_days: input.valid_days,
    is_active: input.is_active ?? true,
  };

  if (input.id) {
    const { error } = await sb.from('pack_templates').update(payload).eq('id', input.id);
    return { ok: !error, error: error?.message ?? null, id: input.id };
  }
  const { data, error } = await sb.from('pack_templates').insert(payload).select('id').single();
  return { ok: !error, error: error?.message ?? null, id: data?.id };
}

export async function sellPack(
  sb: SupabaseClient,
  input: {
    ownerClientId: string;
    templateId?: string | null;
    name: string;
    serviceId: string | null;
    sessionsTotal: number;
    sessionsDone?: number;
    priceCents: number;
    validDays?: number | null;
    friendClientId?: string | null;
    note?: string;
  },
): Promise<PackWriteResult> {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: 'Pon un nombre al bono' };
  if (input.sessionsTotal < 1) return { ok: false, error: 'Pon al menos una sesión' };
  const done = input.sessionsDone ?? 0;
  if (done < 0 || done > input.sessionsTotal) return { ok: false, error: 'Las sesiones usadas no cuadran' };
  if (input.friendClientId && input.friendClientId === input.ownerClientId) {
    return { ok: false, error: 'El pack amigo es otra clienta, no la misma' };
  }
  const { user, salonId } = await salonOf(sb);
  if (!salonId || !user) return { ok: false, error: 'Sin sesión' };

  const today = dayKey(new Date());
  const expires = input.validDays ? addDays(today, input.validDays) : null;

  const { data, error } = await sb.from('client_packs').insert({
    salon_id: salonId,
    template_id: input.templateId || null,
    name,
    service_id: input.serviceId,
    owner_client_id: input.ownerClientId,
    friend_client_id: input.friendClientId || null,
    sessions_total: input.sessionsTotal,
    sessions_done: done,
    price_cents: input.priceCents,
    purchased_at: today,
    expires_at: expires,
    note: input.note?.trim() || null,
    created_by: user.id,
  }).select('id').single();

  return { ok: !error, error: error?.message ?? null, id: data?.id };
}

export async function setPackFriend(
  sb: SupabaseClient,
  packId: string,
  friendClientId: string | null,
): Promise<PackWriteResult> {
  const { data: pack } = await sb
    .from('client_packs')
    .select('owner_client_id')
    .eq('id', packId)
    .maybeSingle();
  if (!pack) return { ok: false, error: 'No está este bono' };
  if (friendClientId && friendClientId === pack.owner_client_id) {
    return { ok: false, error: 'El pack amigo es otra clienta, no la misma' };
  }
  const { error } = await sb
    .from('client_packs')
    .update({ friend_client_id: friendClientId })
    .eq('id', packId);
  return { ok: !error, error: error?.message ?? null };
}

/** Suma sesiones al bono ya vendido (como recargar el papel). */
export async function addPackSessions(
  sb: SupabaseClient,
  packId: string,
  extra: number,
): Promise<PackWriteResult> {
  const n = Math.round(extra);
  if (!Number.isFinite(n) || n < 1) return { ok: false, error: 'Pon al menos una sesión' };
  const { data: pack } = await sb
    .from('client_packs')
    .select('id, sessions_total')
    .eq('id', packId)
    .maybeSingle();
  if (!pack) return { ok: false, error: 'No está este bono' };
  const { error } = await sb
    .from('client_packs')
    .update({ sessions_total: pack.sessions_total + n })
    .eq('id', packId);
  return { ok: !error, error: error?.message ?? null };
}
