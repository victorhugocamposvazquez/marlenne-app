'use client';

import { Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import AccountMenu from '@/components/AccountMenu';
import OfflineBanner from '@/components/OfflineBanner';
import PullRefresh from '@/components/PullRefresh';
import EmbedPanelHint from '@/components/EmbedPanelHint';
import OpsSupportBanner from '@/components/OpsSupportBanner';
import TaskSheetHost from '@/components/personal/TaskSheetHost';
import NewClientSheet from '@/components/clienta/NewClientSheet';
import { useShallowParam } from '@/hooks/useShallowQuery';
import DetailPanel from '@/components/shell/DetailPanel';
import SideNav from '@/components/shell/SideNav';
import type { OpsBanner, ShellSession } from '@/components/shell/PhoneShell';

const ChatHost = dynamic(() => import('@/components/chat/ChatHost'), { ssr: false });

/** Shell recepción: browser / PWA en tablet y escritorio. */
export default function WideShell({
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
  const alta = useShallowParam('alta');
  return (
    <div className="mt-[var(--keyboard-top)] flex h-[calc(100dvh-var(--keyboard-inset)-var(--keyboard-top))] w-full overflow-hidden border-surface-line bg-surface-bg pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] standalone:border-t">
      <SideNav
        role={session.role}
        leads={session.leads === true}
        account={
          <AccountMenu
            variant="rail"
            fullName={session.fullName}
            email={session.email}
          />
        }
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <OpsSupportBanner serverOps={serverOps} />
        <EmbedPanelHint />
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <PullRefresh>{children}</PullRefresh>
          </div>
          <Suspense fallback={null}>
            <DetailPanel />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={null}>
        <TaskSheetHost staff={staff} />
      </Suspense>
      <Suspense fallback={null}>
        <ChatHost role={session.role} />
      </Suspense>
      {alta === '1' && <NewClientSheet />}
    </div>
  );
}
