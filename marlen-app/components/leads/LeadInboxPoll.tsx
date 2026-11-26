'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { pullMyRecentMetaLeads } from '@/app/actions/leads-sync';

const EVERY_MS = 45_000;

/** Con la app abierta, trae los leads nuevos y refresca la bandeja. */
export default function LeadInboxPoll() {
  const router = useRouter();
  const seen = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let busy = false;

    const tick = async () => {
      if (!alive || busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const res = await pullMyRecentMetaLeads();
        if (!alive || !res.ok) return;
        const first = seen.current === null;
        const changed = Boolean(res.newest && res.newest !== seen.current);
        if (res.newest) seen.current = res.newest;
        if (res.imported > 0 || (!first && changed)) router.refresh();
      } catch {
        /* El siguiente minuto lo reintenta. */
      } finally {
        busy = false;
      }
    };

    const start = window.setTimeout(() => { void tick(); }, 1500);
    const id = window.setInterval(() => { void tick(); }, EVERY_MS);
    const onShow = () => { if (document.visibilityState === 'visible') void tick(); };
    document.addEventListener('visibilitychange', onShow);
    return () => {
      alive = false;
      window.clearTimeout(start);
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [router]);

  return null;
}
