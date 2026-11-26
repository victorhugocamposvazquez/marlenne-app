'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { parseLeadsListGroup, type LeadsListGroup } from '@/lib/leads-list-group';
import { leadsDesk } from '@/lib/leads-desk';

export async function getLeadsListGroup(): Promise<LeadsListGroup> {
  const { listGroup } = await leadsDesk();
  return listGroup;
}

export async function saveLeadsListGroup(group: LeadsListGroup) {
  const me = await requireRole('admin');
  const next = parseLeadsListGroup(group);
  const sb = createClient();
  const { error } = await sb.from('salons').update({ leads_list_group: next }).eq('id', me.salon_id);
  if (error) {
    return { ok: false as const, error: /leads_list_group/i.test(error.message) ? 'Falta la migración de leads en la base.' : error.message };
  }
  revalidatePath('/leads');
  revalidatePath('/ajustes/leads');
  return { ok: true as const };
}