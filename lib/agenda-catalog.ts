import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientOption, ServiceOption, WaitItem } from '@/lib/types';

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
