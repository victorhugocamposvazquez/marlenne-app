'use client';

import { useEffect, useState, type ReactNode } from 'react';
import PhoneShell, { type OpsBanner, type ShellSession } from '@/components/shell/PhoneShell';
import WideShell from '@/components/shell/WideShell';

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

  if (!wide) {
    return (
      <PhoneShell session={session} serverOps={serverOps} staff={staff}>
        {children}
      </PhoneShell>
    );
  }

  return (
    <WideShell session={session} serverOps={serverOps} staff={staff}>
      {children}
    </WideShell>
  );
}
