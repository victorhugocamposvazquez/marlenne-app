'use client';

import PersonalHeader from '@/components/personal/PersonalHeader';
import AjustesIndex from '@/components/ajustes/AjustesIndex';
import type { ReadyItem } from '@/lib/ready';
import type { StaffRole } from '@/lib/types';

export default function PersonalAjustesShell({
  me,
  ready,
  greeting,
}: {
  me: { full_name: string; job_title: string | null; role: StaffRole };
  ready: ReadyItem[];
  greeting: string;
}) {
  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-[22px] pb-fab pt-7">
      <PersonalHeader greeting={greeting} title="Ajustes" showAdd={false} />
      <AjustesIndex me={me} ready={ready} personal embedded />
    </div>
  );
}
