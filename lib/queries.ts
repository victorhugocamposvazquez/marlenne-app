import { createClient } from '@/lib/supabase/server';
import { toTimestamp, dateFromOffset, dayKey, weekMondayOffset } from '@/lib/time';
import { APPT_SELECT, mapAppt } from '@/lib/agenda-appt';
import type {
  AgendaAppt, AgendaBlock, ClientListRow, ClientOption, ClientRow, Consent, Provider, ServiceOption,
  TreatmentRow, WaitItem, WeekDay,
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

export async function listServices(opts?: { includeInactive?: boolean }): Promise<ServiceOption[]> {
  const sb = createClient();
  let query = sb
    .from('services')
    .select('id, name, category, duration_min, price_cents, is_active')
    .order('category')
    .order('sort_order');
  if (!opts?.includeInactive) query = query.eq('is_active', true);
  const { data } = await query;
  return (data ?? []) as ServiceOption[];
}

/** Solo lo que necesita el selector del sheet de nueva cita. */
export async function listClientOptions(): Promise<ClientOption[]> {
  const sb = createClient();
  const { data } = await sb.from('clients').select('id, full_name, phone').order('full_name');
  return (data ?? []) as ClientOption[];
}

export async function getAppointment(id: string): Promise<AgendaAppt | null> {
  const sb = createClient();
  const { data } = await sb.from('appointments').select(APPT_SELECT).eq('id', id).maybeSingle();
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

  const [appts, blocks] = await Promise.all([
    sb.from('appointments').select(APPT_SELECT)
      .gte('starts_at', from).lte('starts_at', to)
      .in('provider_id', providerIds).order('starts_at'),
    sb.from('time_blocks').select('id, provider_id, reason, label, starts_at, duration_min')
      .gte('starts_at', from).lte('starts_at', to)
      .in('provider_id', providerIds),
  ]);

  return {
    appointments: (appts.data ?? []).map(mapAppt),
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
    .select('id, starts_at, duration_min, status, client_name, service:services(name, category), provider:staff!appointments_provider_id_fkey(full_name), client:clients(full_name)')
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
        client_label: a.client?.full_name ?? a.client_name ?? 'Sin nombre',
        service_name: a.service?.name ?? '',
        provider_name: a.provider?.full_name ?? '',
        status: a.status,
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
  if (ids.length) {
    const now = new Date().toISOString();
    const [{ data: upcoming }, { data: past }] = await Promise.all([
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
    ]);
    for (const a of upcoming ?? []) {
      if (a.client_id && !nextBy.has(a.client_id)) nextBy.set(a.client_id, a.starts_at);
    }
    for (const a of past ?? []) {
      if (a.client_id && !lastBy.has(a.client_id)) lastBy.set(a.client_id, a.starts_at);
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
    next_at: nextBy.get(c.id) ?? null,
    last_at: lastBy.get(c.id) ?? null,
  }));
}

export async function getClient(id: string) {
  const sb = createClient();
  const [client, treatments] = await Promise.all([
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
  ]);
  return {
    client: (client.data ?? null) as ClientRow | null,
    treatments: (treatments.data ?? []) as unknown as TreatmentRow[],
  };
}

export async function listClientAppointments(clientId: string): Promise<AgendaAppt[]> {
  const sb = createClient();
  const { data } = await sb
    .from('appointments')
    .select(APPT_SELECT)
    .eq('client_id', clientId)
    .order('starts_at', { ascending: false })
    .limit(60);
  return (data ?? []).map(mapAppt);
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
