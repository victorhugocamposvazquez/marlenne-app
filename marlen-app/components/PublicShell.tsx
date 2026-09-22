import type { ReactNode } from 'react';

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-full max-w-[440px] flex-col overflow-y-auto bg-surface-bg pt-[env(safe-area-inset-top)]">
      {children}
    </div>
  );
}
