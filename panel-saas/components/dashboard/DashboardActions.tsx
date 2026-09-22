'use client';

import { Plus } from 'lucide-react';
import ModalTrigger from '@/components/ui/ModalTrigger';

export default function DashboardActions() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="lg:hidden" />
      <ModalTrigger kind="company" className="inline-flex h-11 items-center gap-2 rounded-pill bg-grad px-4 text-[14px] font-bold text-white shadow-brand">
        <Plus size={16} /> Alta de empresa
      </ModalTrigger>
    </div>
  );
}
