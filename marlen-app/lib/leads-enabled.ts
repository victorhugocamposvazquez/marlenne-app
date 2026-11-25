import { createClient } from '@/lib/supabase/server';

/** Lo enciende OPS. Si la columna aún no existe, la función está apagada. */
export async function leadsEnabled(salonId: string): Promise<boolean> {
  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('salons')
      .select('feature_leads')
      .eq('id', salonId)
      .maybeSingle();
    if (error) return false;
    return (data as { feature_leads?: boolean | null } | null)?.feature_leads === true;
  } catch {
    return false;
  }
}
