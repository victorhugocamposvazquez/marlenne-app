import { createClient } from '@/lib/supabase/server';
import { toTimestamp, dateFromOffset, dayKey, weekMondayOffset, isRecallDue } from '@/lib/time';
import { APPT_SELECT, APPT_SELECT_CORE, mapAppt } from '@/lib/agenda-appt';
import { packExpired, packRemaining } from '@/lib/packs';
import { listClientPacks, listPackTemplates, listSalonPacks } from '@/lib/pack-write';
import type {
  AgendaAppt, AgendaBlock, ClientListRow, ClientOption, ClientPack, ClientRow, Consent, PackTemplate, Provider,
  RecallRow, ServiceCategory, ServiceOption, TreatmentRow, WaitItem, WeekDay,
} from '@/lib/types';

export async function getSession() {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb
      .from('staff')
      .select('id, full_name, role, salon_id, initials, color, job_title')
      .eq('id', user.id)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export async function listStaff(opts?: { includeInactive?: boolean }): Promise<Provider[]> {
  try {
    const sb = createClient();
    let query = sb
      .from('staff')
      .select('id, full_name, initials, role, job_title, color, is_active')
      .order('sort_order');
    if (!opts?.includeInactive) query = query.eq('is_active', true);
    const { data } = await query;
    return data ?? [];
  } catch {
    return [];
  }
}

export const listProviders = async () =>
  (await listStaff()).filter(s => s.role === 'provider');

/** Emails del equipo para rellenar el login (el login no tiene sesión). */
export async function listLoginTeam(): Promise<{ name: string; email: string }[]> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const [{ data: staff }, { data: users }] = await Promise.all([
      admin.from('staff').select('id, full_name').eq('is_active', true).order('sort_order'),
      admin.auth.admin.listUsers({ perPage: 200 }),
    ]);
    const emailById = new Map((users?.users ?? []).map(u => [u.id, u.email ?? '']));
    return (staff ?? [])
      .map(s => ({ name: s.full_name, email: emailById.get(s.id) ?? '' }))
      .filter(s => s.email);
  } catch {
    return [];
  }
}

export async function listCategories(): Promise<ServiceCategory[]> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('service_categories')
      .select('id, slug, name, color, sort_order, is_active, opens_treatment')
      .order('sort_order');
    return (data ?? []) as ServiceCategory[];
  } catch {
    return [];
  }
}

function mapService(row: Record<string, unknown>): ServiceOption {
  const cat = row.cat as { name?: string; color?: string } | null;
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    category_id: (row.category_id as string | undefined) ?? undefined,
    category_label: cat?.name,
    category_color: cat?.color,
    color: (row.color as string | null | undefined) ?? null,
    duration_min: row.duration_min as number,
    price_cents: row.price_cents as number,
    is_active: row.is_active as boolean | undefined,
  };
}

export async function listServices(opts?: { includeInactive?: boolean }): Promise<ServiceOption[]> {
  const sb = createClient();
  let query = sb
    .from('services')
    .select('id, name, category, category_id, duration_min, price_cents, is_active, color, cat:service_categories(name, color)')
    .order('sort_order');
  if (!opts?.includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error || !data) {
    let fallback = sb
      .from('services')
      .select('id, name, category, duration_min, price_cents, is_active')
      .order('category')
      .order('sort_order');
    if (!opts?.includeInactive) fallback = fallback.eq('is_active', true);
    const again = await fallback;
    return (again.data ?? []) as ServiceOption[];
  }
  return data.map(row => mapService(row as Record<string, unknown>));
}

/** Solo lo que necesita el selector del sheet de nueva cita. */
export async function listClientOptions(): Promise<ClientOption[]> {
  const sb = createClient();
  const { data } = await sb.from('clients').select('id, full_name, phone').order('full_name');
  return (data ?? []) as ClientOption[];
}

/** Última cita de la clienta (no cancelada): para «lo de siempre». */
export async function lastAppointmentOf(clientId: string) {
  const sb = createClient();
  const { data } = await sb
    .from('appointments')
    .select('provider_id, service:services(name), provider:staff!appointments_provider_id_fkey(full_name)')
    .eq('client_id', clientId)
    .neq('status', 'cancel')
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const service = data.service as { name?: string } | { name?: string }[] | null;
  const provider = data.provider as { full_name?: string } | { full_name?: string }[] | null;
  const serviceName = Array.isArray(service) ? service[0]?.name : service?.name;
  const providerName = Array.isArray(provider) ? provider[0]?.full_name : provider?.full_name;
  if (!serviceName) return null;
  return { serviceName, providerName: providerName ?? '', providerId: data.provider_id as string };
}

export async function getAppointment(id: string): Promise<AgendaAppt | null> {
  const sb = createClient();
  let { data, error } = await sb.from('appointments').select(APPT_SELECT).eq('id', id).maybeSingle();
  if (error && /confirmed_at|client_pack|color/i.test(error.message)) {
    ({ data, error } = await sb.from('appointments').select(APPT_SELECT_CORE).eq('id', id).maybeSingle());
  }
  return data ? mapAppt(data) : null;
}

export async function getAppointmentSms(id: string) {
  const sb = createClient();
  const { data } = await sb
    .from('sms_log')
    .select('status, sent_at')
    .eq('appointment_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { status: string; sent_at: string | null } | null;
}

export async function getDayAgenda(date: Date, providerIds: string[]) {
  if (providerIds.length === 0) return { appointments: [], blocks: [] as AgendaBlock[] };
  const sb = createClient();
  const from = toTimestamp(date, 0);
  const to = toTimestamp(date, 24 * 60 - 1);

  const load = (cols: string) => sb.from('appointments').select(cols)
    .gte('starts_at', from).lte('starts_at', to)
    .in('provider_id', providerIds).order('starts_at');

  const [appts, blocks] = await Promise.all([
    load(APPT_SELECT),
    sb.from('time_blocks').select('id, provider_id, reason, label, starts_at, duration_min')
      .gte('starts_at', from).lte('starts_at', to)
      .in('provider_id', providerIds),
  ]);

  let rows = appts.data;
  if (appts.error) {
    const retry = /confirmed_at|client_pack|color/i.test(appts.error.message) ? await load(APPT_SELECT_CORE) : null;
    rows = retry?.data ?? null;
    if (!rows) console.error('getDayAgenda', appts.error.message);
  }

  return {
    appointments: (rows ?? []).map(mapAppt),
    blocks: (blocks.data ?? []) as AgendaBlock[],
  };
}

export async function getWeekCounts(providerIds: string[], dayOffset = 0): Promise<WeekDay[]> {
  const mondayOff = weekMondayOffset(dayOffset);
  const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const dows = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const empty = dows.map((dow, i) => {
    const offset = mondayOff + i;
    return {
      offset, dow, name: names[i], num: dateFromOffset(offset).getUTCDate(), isToday: offset === 0, appointments: [],
    };
  });
  if (providerIds.length === 0) return empty;

  const sb = createClient();
  const monday = dateFromOffset(mondayOff);
  const sunday = dateFromOffset(mondayOff + 6);

  const { data } = await sb.from('appointments')
    .select('id, starts_at, duration_min, status, price_cents, client_name, service:services(name, category, color), provider:staff!appointments_provider_id_fkey(full_name), client:clients(full_name)')
    .gte('starts_at', toTimestamp(monday, 0))
    .lte('starts_at', toTimestamp(sunday, 24 * 60 - 1))
    .in('provider_id', providerIds)
    .order('starts_at');

  return empty.map(day => ({
    ...day,
    appointments: (data ?? [])
      .filter(a => dayKey(a.starts_at) === dayKey(dateFromOffset(day.offset)))
      .map((a: any) => ({
        id: a.id,
        starts_at: a.starts_at,
        duration_min: a.duration_min,
        category: a.service?.category ?? 'corporal',
        service_color: a.service?.color ?? null,
        client_label: a.client?.full_name ?? a.client_name ?? 'Sin nombre',
        service_name: a.service?.name ?? '',
        provider_name: a.provider?.full_name ?? '',
        status: a.status,
        price_cents: a.price_cents ?? null,
      })),
  }));
}

export async function listClients(): Promise<ClientListRow[]> {
  const sb = createClient();
  const { data } = await sb
    .from('clients')
    .select('id, full_name, phone, tags, treatments(service:services(name), closed_at)')
    .order('full_name');
  const rows = data ?? [];
  const ids = rows.map((c: { id: string }) => c.id);

  const nextBy = new Map<string, string>();
  const lastBy = new Map<string, string>();
  const packsBy = new Map<string, string[]>();
  if (ids.length) {
    const now = new Date().toISOString();
    const today = dayKey(new Date());
    const [{ data: upcoming }, { data: past }, packsRes] = await Promise.all([
      sb.from('appointments')
        .select('client_id, starts_at')
        .in('client_id', ids)
        .in('status', ['prog', 'curso'])
        .gte('starts_at', now)
        .order('starts_at'),
      sb.from('appointments')
        .select('client_id, starts_at')
        .in('client_id', ids)
        .eq('status', 'done')
        .gte('starts_at', toTimestamp(dateFromOffset(-400), 0))
        .lt('starts_at', now)
        .order('starts_at', { ascending: false }),
      sb.from('client_packs')
        .select('name, sessions_done, sessions_total, expires_at, owner_client_id, friend_client_id'),
    ]);
    for (const a of upcoming ?? []) {
      if (a.client_id && !nextBy.has(a.client_id)) nextBy.set(a.client_id, a.starts_at);
    }
    for (const a of past ?? []) {
      if (a.client_id && !lastBy.has(a.client_id)) lastBy.set(a.client_id, a.starts_at);
    }
    if (!packsRes.error) {
      for (const p of packsRes.data ?? []) {
        if (packExpired(p.expires_at, today)) continue;
        if (packRemaining(p) <= 0) continue;
        const label = `${p.name} ${packRemaining(p)}/${p.sessions_total}`;
        for (const cid of [p.owner_client_id, p.friend_client_id]) {
          if (!cid) continue;
          const list = packsBy.get(cid) ?? [];
          list.push(label);
          packsBy.set(cid, list);
        }
      }
    }
  }

  return (rows as unknown as {
    id: string; full_name: string; phone: string | null; tags: string[] | null;
    treatments?: { service?: { name: string } | null; closed_at: string | null }[];
  }[]).map(c => ({
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
  }));
}

export async function getClient(id: string) {
  const sb = createClient();
  const [client, treatments, packs] = await Promise.all([
    sb.from('clients').select('*').eq('id', id).maybeSingle(),
    sb.from('treatments')
      .select(`
        id, zone, sessions_done, sessions_total, last_params, note, opened_at, closed_at,
        service:services(name, category),
        provider:staff!treatments_provider_id_fkey(full_name),
        measurements(id, metric, value_num, value_text, unit, session_no, is_baseline, measured_at),
        treatment_photos(id, kind, zone, session_no, storage_path, taken_at)
      `)
      .eq('client_id', id)
      .order('opened_at', { ascending: false }),
    listClientPacks(sb, id),
  ]);
  return {
    client: (client.data ?? null) as ClientRow | null,
    treatments: (treatments.data ?? []) as unknown as TreatmentRow[],
    packs,
  };
}

export async function listSalonPackTemplates(): Promise<PackTemplate[]> {
  return listPackTemplates(createClient(), { includeInactive: true });
}

export async function listSoldPacks(): Promise<ClientPack[]> {
  return listSalonPacks(createClient());
}

export async function listClientAppointments(clientId: string): Promise<AgendaAppt[]> {
  const sb = createClient();
  const primary = await sb
    .from('appointments')
    .select(APPT_SELECT)
    .eq('client_id', clientId)
    .order('starts_at', { ascending: false })
    .limit(60);
  let rows: unknown[] = primary.data ?? [];
  if (primary.error && /confirmed_at|client_pack|color/i.test(primary.error.message)) {
    const retry = await sb
      .from('appointments')
      .select(APPT_SELECT_CORE)
      .eq('client_id', clientId)
      .order('starts_at', { ascending: false })
      .limit(60);
    rows = retry.data ?? [];
  }
  return rows.map(mapAppt);
}

export async function listConsents(clientId: string): Promise<Consent[]> {
  const sb = createClient();
  const { data } = await sb
    .from('consents')
    .select('id, kind, signed_at, expires_at')
    .eq('client_id', clientId)
    .order('signed_at', { ascending: false });
  return (data ?? []) as Consent[];
}

/**
 * El bucket de fotos es privado: hay que firmar cada ruta. Media hora basta
 * para mirar una ficha y evita repartir enlaces que sobrevivan a la sesión.
 */
export async function signedPhotoUrls(paths: string[]) {
  const map: Record<string, string> = {};
  if (!paths.length) return map;
  const sb = createClient();
  const { data } = await sb.storage.from('treatment-photos').createSignedUrls(paths, 60 * 30);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export async function listRecalls(limit = 6): Promise<RecallRow[]> {
  const sb = createClient();
  const now = new Date().toISOString();
  const [{ data: past }, { data: upcoming }] = await Promise.all([
    sb.from('appointments')
      .select('client_id, starts_at, service:services(name), client:clients(full_name, phone)')
      .eq('status', 'done')
      .not('client_id', 'is', null)
      .gte('starts_at', toTimestamp(dateFromOffset(-400), 0))
      .lt('starts_at', now)
      .order('starts_at', { ascending: false }),
    sb.from('appointments')
      .select('client_id')
      .in('status', ['prog', 'curso'])
      .gte('starts_at', now)
      .not('client_id', 'is', null),
  ]);
  const busy = new Set((upcoming ?? []).map(a => a.client_id).filter(Boolean) as string[]);
  const seen = new Set<string>();
  const rows: RecallRow[] = [];
  for (const a of past ?? []) {
    if (!a.client_id || seen.has(a.client_id) || busy.has(a.client_id)) continue;
    seen.add(a.client_id);
    if (!isRecallDue(a.starts_at, null)) continue;
    const client = a.client as { full_name?: string; phone?: string | null } | null;
    const service = a.service as { name?: string } | null;
    rows.push({
      client_id: a.client_id,
      full_name: client?.full_name ?? 'Sin nombre',
      phone: client?.phone ?? null,
      last_at: a.starts_at,
      service_name: service?.name ?? null,
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

export async function countWaitlist() {
  const sb = createClient();
  const { count } = await sb
    .from('waitlist')
    .select('id', { count: 'exact', head: true })
    .is('resolved_at', null);
  return count ?? 0;
}

export async function listWaitlist(): Promise<WaitItem[]> {
  const sb = createClient();
  const { data } = await sb
    .from('waitlist')
    .select('id, client_id, client_name, preference, created_at, service:services(name, category), client:clients(full_name, phone)')
    .is('resolved_at', null)
    .order('created_at');
  return (data ?? []) as unknown as WaitItem[];
}

/** Huecos libres vía la función SQL free_slots(). */
export async function freeSlots(
  providerId: string, date: Date | string, durationMin: number, excludeId?: string,
) {
  const sb = createClient();
  const { data } = await sb.rpc('free_slots', {
    p_provider: providerId,
    p_date: dayKey(date),
    p_duration: durationMin,
    p_exclude: excludeId ?? null,
    p_step: 15,
  });
  return (data ?? []) as string[];
}
