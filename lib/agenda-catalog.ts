import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgendaAppt, AgendaBlock, ClientOption, ClientPack, ServiceOption, WaitItem } from '@/lib/types';
import { listSalonPacks } from '@/lib/pack-write';
import { APPT_SELECT, APPT_SELECT_CORE, mapAppt } from '@/lib/agenda-appt';
import { toTimestamp } from '@/lib/time';

export async function loadServices(sb: SupabaseClient): Promise<ServiceOption[]> {
  const { data } = await sb
    .from('services')
    .select('id, name, category, duration_min, price_cents, is_active')
    .eq('is_active', true)
    .order('category')
    .order('sort_order');
  return (data ?? []) as ServiceOption[];
}

export async function loadClientOptions(sb: SupabaseClient): Promise<ClientOption[]> {
  const { data } = await sb.from('clients').select('id, full_name, phone').order('full_name');
  return (data ?? []) as ClientOption[];
}

export async function loadSalonPacks(sb: SupabaseClient): Promise<ClientPack[]> {
  return listSalonPacks(sb);
}

export async function loadWaitlist(sb: SupabaseClient): Promise<WaitItem[]> {
  const { data } = await sb
    .from('waitlist')
    .select('id, client_id, client_name, preference, created_at, service:services(name, category), client:clients(full_name, phone)')
    .is('resolved_at', null)
    .order('created_at');
  return (data ?? []) as unknown as WaitItem[];
}

export async function loadSignedPhotoUrls(sb: SupabaseClient, paths: string[]) {
  const map: Record<string, string> = {};
  if (!paths.length) return map;
  const { data } = await sb.storage.from('treatment-photos').createSignedUrls(paths, 60 * 30);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export async function loadDayAgenda(sb: SupabaseClient, date: string, providerIds: string[]) {
  if (providerIds.length === 0) return { appointments: [] as AgendaAppt[], blocks: [] as AgendaBlock[] };
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
  }
  return {
    appointments: (rows ?? []).map(mapAppt),
    blocks: (blocks.data ?? []) as AgendaBlock[],
  };
}
