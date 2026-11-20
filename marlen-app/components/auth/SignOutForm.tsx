'use client';

import type { ReactNode } from 'react';
import { signOut } from '@/app/actions/auth';
import { clearPrivateCaches } from '@/hooks/sheet-catalog';

export default function SignOutForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={signOut}
      className={className}
      onSubmit={() => { clearPrivateCaches(); }}
    >
      {children}
    </form>
  );
}
