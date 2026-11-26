import type { MetaSyncResult } from '@/app/actions/leads-sync';

export function metaSyncSummary(res: MetaSyncResult) {
  if (!res.ok) return res.error;
  const entered = res.imported === 1 ? 'Entró 1 nuevo' : `Entraron ${res.imported} nuevos`;
  const already = res.skipped > 0 ? `. ${res.skipped} ya estaban` : '';
  return res.done ? `${entered}${already}. No quedan más en Facebook.` : `${entered}${already}. Hay más.`;
}