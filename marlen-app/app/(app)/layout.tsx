import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import BottomNav from '@/components/BottomNav';
import PullRefresh from '@/components/PullRefresh';
import StaffReminderEngine from '@/components/StaffReminderEngine';
import ToastProvider from '@/components/Toast';
import EmbedPanelHint from '@/components/EmbedPanelHint';
import OpsSupportBanner from '@/components/OpsSupportBanner';
import StaffPrefsSync from '@/components/StaffPrefsSync';
import { getStaffVoicePrefs } from '@/lib/queries';
import { readOpsSession } from '@/lib/ops-support-audit';
import { staffRoleLabel } from '@/lib/ops-support';
import { requireSession } from '@/lib/require-session';

const VoiceFab = dynamic(() => import('@/components/VoiceFab'), { ssr: false });

export const maxDuration = 20;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireSession();
  const staffVoice = await getStaffVoicePrefs(me.id);
  const opsCtx = readOpsSession();
  const serverOps = opsCtx
    ? {
      staffName: me.full_name,
      staffRole: staffRoleLabel(me.role),
      opsEmail: opsCtx.opsEmail,
      company: opsCtx.companyName,
    }
    : null;

  return (
    <ToastProvider>
      <StaffPrefsSync staffId={me.id} voice={staffVoice} />
      <StaffReminderEngine />
      <div className="@container relative mx-auto flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-surface-bg pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <OpsSupportBanner serverOps={serverOps} />
        <EmbedPanelHint />
        <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
          <PullRefresh>{children}</PullRefresh>
        </div>
        <Suspense fallback={null}>
          <VoiceFab />
        </Suspense>
        <BottomNav role={me.role} />
      </div>
    </ToastProvider>
  );
}
