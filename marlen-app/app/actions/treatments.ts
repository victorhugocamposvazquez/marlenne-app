'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { addTreatmentPhoto as addPhotoWrite } from '@/lib/agenda-write';

export async function addTreatmentPhoto(input: {
  treatmentId: string;
  kind: 'before' | 'after';
  zone?: string;
  sessionNo?: number;
  storagePath: string;
}) {
  const r = await addPhotoWrite(createClient(), input);
  revalidatePath('/clientas');
  return r;
}
