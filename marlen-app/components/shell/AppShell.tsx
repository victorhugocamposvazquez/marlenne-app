'use client';

import { useEffect, useState, type ReactNode } from 'react';
import PhoneShell, { type OpsBanner, type ShellSession } from '@/components/shell/PhoneShell';
import WideShell from '@/components/shell/WideShell';
import WarmScreens from '@/components/shell/WarmScreens';
import LeadInboxPoll from '@/components/leads/LeadInboxPoll';
import { isSlowNetwork } from '@/hooks/net-client';
import { warmSheetCatalog } from '@/hooks/sheet-catalog';
import { createClient } from '@/lib/supabase/client';

const WIDE_MQ = '(min-width: 1024px)';

function readWide(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as Window & { Capacitor?: unknown }).Capacitor) return false;
  return window.matchMedia(WIDE_MQ).matches;
}

export default function AppShell({
  session,
  serverOps,
  staff = [],
  children,
}: {
  session: ShellSession;
  serverOps: OpsBanner;
  staff?: { id: string; full_name: string }[];
  children: ReactNode;
}) {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (isSlowNetwork()) return;
    const run = () => { void warmSheetCatalog(createClient()); };
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(run, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 700);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const apply = () => setWide(readWide());
    apply();
    const mq = window.matchMedia(WIDE_MQ);
    mq.addEventListener('change', apply);
    window.addEventListener('resize', apply);
    return () => {
      mq.removeEventListener('change', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);

  const shell = wide ? (
    <WideShell session={session} serverOps={serverOps} staff={staff}>
      {children}
    </WideShell>
  ) : (
    <PhoneShell session={session} serverOps={serverOps} staff={staff}>
      {children}
    </PhoneShell>
  );

  return (
    <>
      <WarmScreens role={session.role} />
      {session.leads && session.role !== 'provider' && <LeadInboxPoll />}
      {shell}
    </>
  );
}
