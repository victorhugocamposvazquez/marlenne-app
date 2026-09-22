'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Recepción y cabina miran la misma agenda: un cambio en Postgres refresca la vista. */
export function useRealtimeRefresh(tables: string[]) {
  const router = useRouter();

  useEffect(() => {
    const sb = createClient();
    const channel = sb.channel(`live:${tables.join(',')}`);
    let t: number | undefined;
    const bump = () => {
      if (document.hidden) return;
      window.clearTimeout(t);
      t = window.setTimeout(() => router.refresh(), 160);
    };
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump);
    }
    channel.subscribe();
    return () => {
      window.clearTimeout(t);
      void sb.removeChannel(channel);
    };
  }, [tables.join(','), router]);
}
