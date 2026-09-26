'use client';

import { useTransition } from 'react';
import { Check } from 'lucide-react';
import { setPersonalTaskDone } from '@/app/actions/personal-tasks';
import { shallowSet } from '@/hooks/useShallowQuery';
import { dateLbl, dayKey, fmt, minutesOfDay } from '@/lib/time';
import type { PersonalTask } from '@/lib/personal-tasks';

export default function TaskRow({ task, todayKey }: { task: PersonalTask; todayKey: string }) {
  const [pending, startTransition] = useTransition();
  const done = Boolean(task.done_at);
  const time = task.due_at && minutesOfDay(task.due_at) > 0 ? fmt(minutesOfDay(task.due_at)) : null;
  const day = task.due_at ? dayKey(task.due_at) : null;
  const showDay = day && day !== todayKey;

  return (
    <div className="flex items-start gap-2 border-b border-surface-line py-3 last:border-0">
      <button
        type="button"
        aria-label={done ? 'Marcar pendiente' : 'Marcar hecha'}
        disabled={pending}
        onClick={() => startTransition(() => { void setPersonalTaskDone(task.id, !done); })}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${done ? 'border-ink bg-ink text-white' : 'border-ink-3 text-transparent'}`}
      >
        <Check size={14} strokeWidth={2.6} />
      </button>
      <button
        type="button"
        onClick={() => shallowSet({ tarea: task.id })}
        className="min-w-0 flex-1 text-left"
      >
        <span className={`block text-body font-bold ${done ? 'text-ink-3 line-through' : ''}`}>{task.title}</span>
        {(time || showDay) && (
          <span className="mt-0.5 block text-label font-medium text-ink-2">
            {showDay ? dateLbl(task.due_at!) : ''}{showDay && time ? ' · ' : ''}{time ?? ''}
          </span>
        )}
      </button>
    </div>
  );
}
