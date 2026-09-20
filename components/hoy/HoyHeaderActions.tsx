'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import CreateMenu from '@/components/CreateMenu';
import { headerActionsCls } from '@/components/ui/ScreenHeader';
import { circleOutlineCls } from '@/components/ui/IconButton';
import type { StaffRole } from '@/lib/types';

export default function HoyHeaderActions({
  role, waiting,
}: {
  role: StaffRole;
  waiting: number;
}) {
  return (
    <div className={headerActionsCls}>
      <Link
        href="/agenda?wait=1"
        className={`relative ${circleOutlineCls} h-11 w-11`}
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
