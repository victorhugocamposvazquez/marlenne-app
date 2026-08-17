import BottomNav from '@/components/BottomNav';
import { requireSession } from '@/lib/queries';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireSession();

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[440px] flex-col overflow-hidden bg-surface-bg">
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      <BottomNav role={me.role} />
    </div>
  );
}
