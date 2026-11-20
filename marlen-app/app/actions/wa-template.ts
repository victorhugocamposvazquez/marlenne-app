'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { recordOpsAudit } from '@/lib/ops-support-audit';
import { DEFAULT_WA_CONFIRM_TEMPLATE } from '@/lib/phone';

const MAX = 800;

export async function saveWaConfirmTemplate(body: string) {
  const me = await requireRole('admin');
  const text = body.trim();
  if (text.length > MAX) return { ok: false as const, error: `Máximo ${MAX} caracteres` };
  const value = !text || text === DEFAULT_WA_CONFIRM_TEMPLATE ? null : text;
  const sb = createClient();
  const { error } = await sb.from('salons').update({ wa_confirm_template: value }).eq('id', me.salon_id);
  if (error) {
    if (/wa_confirm_template/i.test(error.message)) {
      return { ok: false as const, error: 'Falta aplicar la migración de la plantilla' };
    }
    return { ok: false as const, error: error.message };
  }
  void recordOpsAudit('salon.wa_confirm_template', { salonId: me.salon_id, custom: value !== null });
  revalidatePath('/ajustes/citas');
  revalidatePath('/hoy');
  revalidatePath('/agenda');
  return { ok: true as const, error: null };
}
