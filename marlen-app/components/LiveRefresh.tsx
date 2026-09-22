'use client';

import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

/** Montaje mínimo para que una página servidor se actualice al vuelo. */
export default function LiveRefresh({ tables }: { tables: string[] }) {
  useRealtimeRefresh(tables);
  return null;
}
