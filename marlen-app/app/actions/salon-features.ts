'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { recordOpsAudit } from '@/lib/ops-support-audit';
import type { SalonAgendaFeatures } from '@/lib/salon-features';

export async function saveSalonAgendaFeatures(patch: Partial<SalonAgendaFeatures>) {
  const me = await requireRole('admin');
  const sb = createClient();

  const payload: Record<string, boolean> = {};
  if (typeof patch.apptPayment === 'boolean') payload.feature_appt_payment = patch.apptPayment;
  if (typeof patch.overdueAppts === 'boolean') payload.feature_overdue_appts = patch.overdueAppts;
  if (Object.keys(payload).length === 0) return { ok: true as const, error: null };

  const { error } = await sb.from('salons').update(payload).eq('id', me.salon_id);
  if (error) return { ok: false as const, error: error.message };

  void recordOpsAudit('salon.agenda_features', { salonId: me.salon_id, ...payload });
  revalidatePath('/ajustes/citas');
  revalidatePath('/hoy');
  revalidatePath('/agenda');
  return { ok: true as const, error: null };
}
