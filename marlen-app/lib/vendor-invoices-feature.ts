import type { SupabaseClient } from '@supabase/supabase-js';
import { vendorInvoicesEnabledFromRow } from '@/lib/salon-features';

export async function salonHasVendorInvoices(
  sb: SupabaseClient,
  salonId: string,
): Promise<boolean> {
  const { data, error } = await sb
    .from('salons')
    .select('feature_vendor_invoices')
    .eq('id', salonId)
    .maybeSingle();
  if (error) {
    if (/feature_vendor_invoices/i.test(error.message)) return false;
    return false;
  }
  return vendorInvoicesEnabledFromRow(data);
}
