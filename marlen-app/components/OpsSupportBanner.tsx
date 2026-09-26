'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EMBED_PANEL_STORAGE } from '@/lib/embed-panel';
import { OPS_SUPPORT_STORAGE, parseOpsSupportSession, type OpsSupportSession } from '@/lib/ops-support';

function OpsSupportBannerInner() {
  const sp = useSearchParams();
  const [session, setSession] = useState<OpsSupportSession | null>(null);

  useEffect(() => {
    if (sp.get('ops_support') === '1') {
      const next: OpsSupportSession = {
        company: sp.get('ops_company')?.trim() || 'Centro',
        by: sp.get('ops_by')?.trim() || 'Ops',
        since: Date.now(),
      };
      sessionStorage.setItem(OPS_SUPPORT_STORAGE, JSON.stringify(next));
      if (sp.get('embed') === '1') {
        try { sessionStorage.setItem(EMBED_PANEL_STORAGE, '1'); } catch { /* ignore */ }
      }
      setSession(next);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('ops_support');
        url.searchParams.delete('ops_company');
        url.searchParams.delete('ops_by');
        url.searchParams.delete('embed');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch {
        /* ignore */
      }
      return;
    }
    setSession(parseOpsSupportSession(sessionStorage.getItem(OPS_SUPPORT_STORAGE)));
  }, [sp]);

  if (!session) return null;

  return (
    <div
      role="status"
      className="shrink-0 border-b border-[#FCD34D] bg-[#FFFBEB] px-4 py-2 text-center text-[12px] font-semibold leading-snug text-[#92400E]"
    >
      Modo soporte · Ops ({session.by}) dentro de {session.company}. Los cambios son reales y quedan registrados.
    </div>
  );
}

export default function OpsSupportBanner() {
  return (
    <Suspense fallback={null}>
      <OpsSupportBannerInner />
    </Suspense>
  );
}
