'use client';

import { useTransition } from 'react';
import { Bell, Check } from 'lucide-react';
import { setPersonalTaskDone } from '@/app/actions/personal-tasks';
import { shallowSet } from '@/hooks/useShallowQuery';
import { taskWhenLabel } from '@/lib/personal-tasks';
import { fmt, minutesOfDay } from '@/lib/time';
import type { PersonalTask } from '@/lib/personal-tasks';

export default function TaskRow({ task, todayKey }: { task: PersonalTask; todayKey: string }) {
  const [pending, startTransition] = useTransition();
  const done = Boolean(task.done_at);
  const mins = task.due_at ? minutesOfDay(task.due_at) : 0;
  const time = mins > 0 ? fmt(mins) : null;
  const when = task.due_at ? taskWhenLabel(task.due_at, todayKey, time) : '';
  const hasRemind = Boolean(task.remind_at && !done);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => shallowSet({ tarea: task.id })}
      onKeyDown={e => { if (e.key === 'Enter') shallowSet({ tarea: task.id }); }}
      className="flex cursor-pointer items-center gap-3 rounded-row bg-surface-soft px-3.5 py-[13px] motion-safe:active:scale-[.99]"
    >
      <button
        type="button"
        aria-label={done ? 'Marcar pendiente' : 'Marcar hecha'}
        disabled={pending}
        onClick={e => {
          e.stopPropagation();
          startTransition(() => { void setPersonalTaskDone(task.id, !done); });
        }}
        className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full p-0 ${
          done ? 'border-0 bg-v-2 text-white' : 'border-2 border-[#D9D8E0] bg-white text-transparent'
        }`}
      >
        {done && <Check size={12} strokeWidth={3.4} />}
      </button>
      <div className="min-w-0 flex-1">
        <span className={`block text-[15px] font-semibold ${done ? 'text-ink-3 line-through' : 'text-ink'}`}>
          {task.title}
        </span>
        {when && (
          <span className="mt-px block text-[12.5px] text-ink-3">{when}</span>
        )}
      </div>
      {hasRemind && (
        <Bell size={15} strokeWidth={2} className="shrink-0 text-ink-3" aria-hidden />
      )}
    </div>
  );
}
