import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import BottomNav from '@/components/BottomNav';
import RegisterSW from '@/components/RegisterSW';
import ToastProvider from '@/components/Toast';
import { requireSession } from '@/lib/require-session';

const VoiceFab = dynamic(() => import('@/components/VoiceFab'), { ssr: false });

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireSession();

  return (
    <ToastProvider>
      <RegisterSW />
      <div className="relative mx-auto flex h-[100dvh] max-w-[440px] flex-col overflow-hidden bg-surface-bg pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <Suspense fallback={null}>
          <VoiceFab />
        </Suspense>
        <BottomNav role={me.role} />
      </div>
    </ToastProvider>
  );
}
