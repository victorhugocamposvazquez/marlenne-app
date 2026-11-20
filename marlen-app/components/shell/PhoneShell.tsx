'use client';

import { Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import AccountMenu from '@/components/AccountMenu';
import OfflineBanner from '@/components/OfflineBanner';
import BottomNav from '@/components/BottomNav';
import PullRefresh from '@/components/PullRefresh';
import EmbedPanelHint from '@/components/EmbedPanelHint';
import OpsSupportBanner from '@/components/OpsSupportBanner';
import ProfileSheetHost from '@/components/ProfileSheetHost';
import MoreSheetHost from '@/components/MoreSheetHost';
import TaskSheetHost from '@/components/personal/TaskSheetHost';

const ChatHost = dynamic(() => import('@/components/chat/ChatHost'), { ssr: false });

export type ShellSession = {
  role: string;
  fullName: string;
  email: string;
  salonName: string;
  /** legacy opcionales */
  workspace?: string;
  hasPersonal?: boolean;
};

export type OpsBanner = {
  staffName: string;
  staffRole: string;
  opsEmail: string;
  company: string;
} | null;

/** Cáscara phone: Capacitor / móvil / PWA estrecha. */
export default function PhoneShell({
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
  return (
    <div className="@container relative mx-auto mt-[var(--keyboard-top)] flex h-[calc(100dvh-var(--keyboard-inset)-var(--keyboard-top))] w-full max-w-[440px] flex-col overflow-hidden bg-surface-bg pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <OfflineBanner />
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
        />
      </Suspense>
      <Suspense fallback={null}>
        <MoreSheetHost />
      </Suspense>
      <Suspense fallback={null}>
        <TaskSheetHost staff={staff} />
      </Suspense>
      <Suspense fallback={null}>
        <ChatHost role={session.role} />
      </Suspense>
      <BottomNav
        role={session.role}
        account={<AccountMenu />}
      />
    </div>
  );
}
