import type { SupabaseClient } from '@supabase/supabase-js';
import {
  salonBrandingFromRow,
  salonEmisorFromBranding,
  type SalonBranding,
  type SalonEmisor,
} from '@/lib/salon-branding';

export async function fetchSalonBranding(
  sb: SupabaseClient,
  salonId: string,
): Promise<SalonBranding> {
  const { data, error } = await sb
    .from('salons')
    .select('name, legal_name, tax_id, fiscal_address, phone, logo_path')
    .eq('id', salonId)
    .maybeSingle();

  if (error && /legal_name|tax_id|fiscal_address|logo_path/i.test(error.message)) {
    const retry = await sb.from('salons').select('name, phone').eq('id', salonId).maybeSingle();
    return salonBrandingFromRow(retry.data ?? { name: '' });
  }

  return salonBrandingFromRow(data);
}

export async function fetchSalonEmisor(
  sb: SupabaseClient,
  salonId: string,
): Promise<SalonEmisor> {
  return salonEmisorFromBranding(await fetchSalonBranding(sb, salonId));
}
