import { cache } from 'react';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { parseLeadsListGroup, type LeadsListGroup } from '@/lib/leads-list-group';

type SalonLeadsRow = { feature_leads?: boolean | null; leads_list_group?: string | null };

/** Rol, feature y modo de agrupación en una sola lectura de `salons`. */
export const leadsDesk = cache(async () => {
  const me = await requireRole('admin', 'reception');
  let on = false;
  let listGroup: LeadsListGroup = 'campaign';
  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('salons')
      .select('feature_leads, leads_list_group')
      .eq('id', me.salon_id)
      .maybeSingle();
    if (!error && data) {
      const row = data as SalonLeadsRow;
      on = row.feature_leads === true;
      listGroup = parseLeadsListGroup(row.leads_list_group);
    }
  } catch {
    /* columnas aún no migradas */
  }
  return { me, on, listGroup };
});