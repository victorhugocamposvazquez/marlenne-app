'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { parseLeadsListGroup, type LeadsListGroup } from '@/lib/leads-list-group';

export async function getLeadsListGroup(): Promise<LeadsListGroup> {
  const me = await requireRole('admin', 'reception');
  const sb = createClient();
  const { data, error } = await sb
    .from('salons')
    .select('leads_list_group')
    .eq('id', me.salon_id)
    .maybeSingle();
  if (error) return 'campaign';
  return parseLeadsListGroup((data as { leads_list_group?: string } | null)?.leads_list_group);
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