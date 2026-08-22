'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toTimestamp } from '@/lib/time';
import type { BlockReason } from '@/lib/consents';

export async function createBlock(input: {
  providerId: string;
  date: string;
  startMin: number;
  durationMin: number;
  reason: BlockReason;
  label?: string;
}) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: 'Sin sesión' };
  const { data: staff } = await sb.from('staff').select('salon_id').eq('id', user.id).maybeSingle();
  if (!staff) return { ok: false, error: 'Sin sesión' };

  const { error } = await sb.from('time_blocks').insert({
    salon_id: staff.salon_id,
    provider_id: input.providerId,
    reason: input.reason,
    label: input.label?.trim() || null,
    starts_at: toTimestamp(input.date, input.startMin),
    duration_min: input.durationMin,
  });

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return { ok: !error, error: error?.message ?? null };
}

export async function deleteBlock(id: string) {
  const sb = createClient();
  const { error } = await sb.from('time_blocks').delete().eq('id', id);
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return { ok: !error, error: error?.message ?? null };
}
