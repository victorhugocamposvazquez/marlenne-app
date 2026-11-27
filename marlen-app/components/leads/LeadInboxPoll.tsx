'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { pullMyRecentMetaLeads } from '@/app/actions/leads-sync';

const EVERY_MS = 45_000;

/** Fuera de la bandeja, sigue trayendo leads para el aviso. En Leads refresca la propia lista. */
export default function LeadInboxPoll() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    let alive = true;
    let busy = false;

    const tick = async () => {
      if (!alive || busy || document.visibilityState === 'hidden') return;
      if (pathRef.current === '/leads') return;
      busy = true;
      try {
        await pullMyRecentMetaLeads();
      } catch {
        /* El siguiente minuto lo reintenta. */
      } finally {
        busy = false;
      }
    };

    const start = window.setTimeout(() => { void tick(); }, 12_000);
    const id = window.setInterval(() => { void tick(); }, EVERY_MS);
    const onShow = () => { if (document.visibilityState === 'visible') void tick(); };
    document.addEventListener('visibilitychange', onShow);
    return () => {
      alive = false;
      window.clearTimeout(start);
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);

  return null;
}
