'use client';

import { Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import AccountMenu from '@/components/AccountMenu';
import PullRefresh from '@/components/PullRefresh';
import EmbedPanelHint from '@/components/EmbedPanelHint';
import OpsSupportBanner from '@/components/OpsSupportBanner';
import ProfileSheetHost from '@/components/ProfileSheetHost';
import TaskSheetHost from '@/components/personal/TaskSheetHost';
import DetailPanel from '@/components/shell/DetailPanel';
import SideNav from '@/components/shell/SideNav';
import type { OpsBanner, ShellSession } from '@/components/shell/PhoneShell';

const VoiceFab = dynamic(() => import('@/components/VoiceFab'), { ssr: false });

/** Shell recepción: browser / PWA en tablet y escritorio. */
export default function WideShell({
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
    <div className="flex h-[100dvh] w-full overflow-hidden bg-surface-bg pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <SideNav
        role={session.role}
        workspace={session.workspace}
        account={(
          <AccountMenu
            workspace={session.workspace}
            hasPersonal={session.hasPersonal}
            variant="rail"
          />
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OpsSupportBanner serverOps={serverOps} />
        <EmbedPanelHint />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <PullRefresh>{children}</PullRefresh>
          </div>
          <Suspense fallback={null}>
            <DetailPanel />
          </Suspense>
        </div>
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
    </div>
  );
}
