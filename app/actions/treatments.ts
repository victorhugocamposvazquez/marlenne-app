'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function addTreatmentPhoto(input: {
  treatmentId: string;
  kind: 'before' | 'after';
  zone?: string;
  sessionNo?: number;
  storagePath: string;
}) {
  const sb = createClient();
  const { error } = await sb.from('treatment_photos').insert({
    treatment_id: input.treatmentId,
    kind: input.kind,
    zone: input.zone?.trim() || null,
    session_no: input.sessionNo ?? null,
    storage_path: input.storagePath,
  });
  revalidatePath('/clientas');
  return { ok: !error, error: error?.message ?? null };
}
