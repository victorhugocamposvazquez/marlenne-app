'use client';

import type { ReactNode } from 'react';
import PhoneShell, { type OpsBanner, type ShellSession } from '@/components/shell/PhoneShell';
import WideShell from '@/components/shell/WideShell';
import { useAppShellMode, useClientMounted } from '@/hooks/useAppShellMode';

export default function AppShell({
  session,
  serverOps,
  children,
}: {
  session: ShellSession;
  serverOps: OpsBanner;
  children: ReactNode;
}) {
  const mounted = useClientMounted();
  const mode = useAppShellMode();

  // Hasta hidratar: phone (seguro para Capacitor y sin mismatch SSR).
  if (!mounted || mode === 'phone') {
    return (
      <PhoneShell session={session} serverOps={serverOps}>
        {children}
      </PhoneShell>
    );
  }

  return (
    <WideShell session={session} serverOps={serverOps}>
      {children}
    </WideShell>
  );
}
