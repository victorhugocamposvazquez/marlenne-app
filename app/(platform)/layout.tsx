import ToastProvider from '@/components/Toast';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col bg-surface-bg px-6 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        {children}
      </div>
    </ToastProvider>
  );
}
