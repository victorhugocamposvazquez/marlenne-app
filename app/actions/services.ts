'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateService(input: {
  id: string;
  duration_min: number;
  price_cents: number;
  is_active: boolean;
}) {
  if (input.duration_min <= 0 || input.price_cents < 0) {
    return { ok: false, error: 'Duración y precio tienen que ser válidos' };
  }
  const sb = createClient();
  const { error } = await sb.from('services').update({
    duration_min: input.duration_min,
    price_cents: input.price_cents,
    is_active: input.is_active,
  }).eq('id', input.id);
  revalidatePath('/ajustes', 'layout');
  revalidatePath('/agenda');
  return { ok: !error, error: error?.message ?? null };
}
