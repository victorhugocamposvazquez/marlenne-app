'use client';

import { Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import AccountMenu from '@/components/AccountMenu';
import BottomNav from '@/components/BottomNav';
import PullRefresh from '@/components/PullRefresh';
import EmbedPanelHint from '@/components/EmbedPanelHint';
import OpsSupportBanner from '@/components/OpsSupportBanner';
import ProfileSheetHost from '@/components/ProfileSheetHost';
import TaskSheetHost from '@/components/personal/TaskSheetHost';
import type { WorkspaceKind } from '@/lib/personal-tasks';

const VoiceFab = dynamic(() => import('@/components/VoiceFab'), { ssr: false });

export type ShellSession = {
  role: string;
  workspace: WorkspaceKind;
  hasPersonal: boolean;
  fullName: string;
  email: string;
  salonName: string;
};

export type OpsBanner = {
  staffName: string;
  staffRole: string;
  opsEmail: string;
  company: string;
} | null;

/** Cáscara phone: Capacitor / móvil / PWA estrecha. No cambiar layout sin querer romper store. */
export default function PhoneShell({
  session,
  serverOps,
  children,
}: {
  session: ShellSession;
  serverOps: OpsBanner;
  children: ReactNode;
}) {
  const personal = session.workspace === 'personal';

  return (
    <div className="@container relative mx-auto flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-surface-bg pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <OpsSupportBanner serverOps={serverOps} />
      <EmbedPanelHint />
      <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        <PullRefresh>{children}</PullRefresh>
      </div>
      <Suspense fallback={null}>
        <ProfileSheetHost
          fullName={session.fullName}
          email={session.email}
          companyName={session.salonName}
          workspace={session.workspace}
          hasPersonal={session.hasPersonal}
        />
      </Suspense>
      {personal && (
        <Suspense fallback={null}>
          <TaskSheetHost />
        </Suspense>
      )}
      {!personal && (
        <Suspense fallback={null}>
          <VoiceFab />
        </Suspense>
      )}
      <BottomNav
        role={session.role}
        workspace={session.workspace}
        account={(
          <AccountMenu workspace={session.workspace} hasPersonal={session.hasPersonal} />
        )}
      />
    </div>
  );
}
