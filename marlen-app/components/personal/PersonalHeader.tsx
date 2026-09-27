'use client';

import { Plus } from 'lucide-react';
import { shallowSet } from '@/hooks/useShallowQuery';

export default function PersonalHeader({
  greeting,
  title,
  dateIso,
  showAdd = true,
}: {
  greeting: string;
  title: string;
  dateIso?: string;
  showAdd?: boolean;
}) {
  const openTask = () => {
    shallowSet({
      tarea: '1',
      ...(dateIso ? { dia: dateIso } : {}),
    });
  };

  return (
    <div className="mb-[22px] flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink-2">{greeting}</p>
        <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-[-.03em] text-ink">{title}</h1>
      </div>
      {showAdd && (
        <button
          type="button"
          aria-label="Nueva tarea"
          onClick={openTask}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-pill border-2 border-ink bg-white text-ink transition motion-safe:active:scale-[.96]"
        >
          <Plus size={20} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
