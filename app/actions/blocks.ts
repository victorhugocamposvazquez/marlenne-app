'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createBlock as createWrite, deleteBlock as deleteWrite } from '@/lib/agenda-write';
import type { BlockReason } from '@/lib/consents';

export async function createBlock(input: {
  providerId: string;
  date: string;
  startMin: number;
  durationMin: number;
  reason: BlockReason;
  label?: string;
}) {
  const r = await createWrite(createClient(), input);
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return r;
}

export async function deleteBlock(id: string) {
  const r = await deleteWrite(createClient(), id);
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return r;
}
