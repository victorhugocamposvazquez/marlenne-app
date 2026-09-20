'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import CreateMenu from '@/components/CreateMenu';
import type { StaffRole } from '@/lib/types';

export default function HoyHeaderActions({
  role, waiting,
}: {
  role: StaffRole;
  waiting: number;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href="/agenda?wait=1"
        className="relative grid h-12 w-12 place-items-center rounded-pill border-2 border-ink bg-transparent text-ink transition motion-safe:active:scale-[.96]"
        aria-label="Lista de espera"
      >
        <Bell size={20} strokeWidth={2} />
        {waiting > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-surface-card bg-v" />
        )}
      </Link>
      <CreateMenu role={role} />
    </div>
  );
}
