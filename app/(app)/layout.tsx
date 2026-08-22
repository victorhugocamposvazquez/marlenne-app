import BottomNav from '@/components/BottomNav';
import RegisterSW from '@/components/RegisterSW';
import ToastProvider from '@/components/Toast';
import { requireSession } from '@/lib/queries';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireSession();

  return (
    <ToastProvider>
      <RegisterSW />
      <div className="mx-auto flex h-[100dvh] max-w-[440px] flex-col overflow-hidden bg-surface-bg">
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        <BottomNav role={me.role} />
      </div>
    </ToastProvider>
  );
}
