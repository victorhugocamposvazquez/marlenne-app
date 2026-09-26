'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EMBED_PANEL_STORAGE } from '@/lib/embed-panel';
import {
  OPS_SUPPORT_STORAGE,
  parseOpsSupportSession,
  type OpsActingAs,
  type OpsSupportSession,
} from '@/lib/ops-support';

function OpsSupportBannerInner({ serverOps }: { serverOps: OpsActingAs | null }) {
  const sp = useSearchParams();
  const [session, setSession] = useState<OpsSupportSession | null>(null);

  useEffect(() => {
    if (sp.get('ops_support') === '1') {
      const next: OpsSupportSession = {
        company: sp.get('ops_company')?.trim() || 'Centro',
        by: sp.get('ops_by')?.trim() || 'Ops',
        since: Date.now(),
        staffName: sp.get('ops_staff')?.trim() || undefined,
        staffRole: sp.get('ops_staff_role')?.trim() || undefined,
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
        url.searchParams.delete('ops_staff');
        url.searchParams.delete('ops_staff_role');
        url.searchParams.delete('embed');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch {
        /* ignore */
      }
      return;
    }
    setSession(parseOpsSupportSession(sessionStorage.getItem(OPS_SUPPORT_STORAGE)));
  }, [sp]);

  const acting = serverOps ?? (session ? {
    staffName: session.staffName ?? 'Usuario del centro',
    staffRole: session.staffRole ?? '',
    opsEmail: session.by,
    company: session.company,
  } : null);

  if (!acting) return null;

  const roleBit = acting.staffRole ? ` (${acting.staffRole})` : '';

  return (
    <div
      role="status"
      className="shrink-0 border-b border-[#FCD34D] bg-[#FFFBEB] px-4 py-2 text-center text-[12px] font-semibold leading-snug text-[#92400E]"
    >
      Modo soporte · Actuando como {acting.staffName}{roleBit} · Ops {acting.opsEmail} · {acting.company}. Cambios reales.
    </div>
  );
}

export default function OpsSupportBanner({ serverOps = null }: { serverOps?: OpsActingAs | null }) {
  return (
    <Suspense fallback={serverOps ? (
      <div className="shrink-0 border-b border-[#FCD34D] bg-[#FFFBEB] px-4 py-2 text-center text-[12px] font-semibold text-[#92400E]">
        Modo soporte · Actuando como {serverOps.staffName}
      </div>
    ) : null}>
      <OpsSupportBannerInner serverOps={serverOps} />
    </Suspense>
  );
}
