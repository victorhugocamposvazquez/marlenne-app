'use server';

import { revalidatePath } from 'next/cache';
import { setOpsAutoSend } from '@/lib/live-center';

export async function toggleOpsAutoSend(on: boolean) {
  const result = await setOpsAutoSend(on);
  if (result.ok) {
    revalidatePath('/sms');
    revalidatePath('/empresas/90001');
  }
  return result;
}
