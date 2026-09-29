'use client';

import type { ReactNode } from 'react';
import PhoneShell, { type OpsBanner, type ShellSession } from '@/components/shell/PhoneShell';
import WideShell from '@/components/shell/WideShell';
import { useAppShellMode, useClientMounted } from '@/hooks/useAppShellMode';

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
  const mounted = useClientMounted();
  const mode = useAppShellMode();

  if (!mounted || mode === 'phone') {
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
