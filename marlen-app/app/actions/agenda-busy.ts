'use server';

import { getBusyOffsets } from '@/lib/queries';

export async function loadAgendaBusyOffsets(
  providerIds: string[],
  startOffset: number,
  dayCount: number,
): Promise<number[]> {
  if (!providerIds.length || dayCount <= 0) return [];
  return getBusyOffsets(providerIds, startOffset, dayCount);
}
