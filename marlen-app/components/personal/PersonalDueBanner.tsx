'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { shallowSet } from '@/hooks/useShallowQuery';
import type { PersonalTask } from '@/lib/personal-tasks';

const KEY = 'marlenne-task-remind-hide';

function hiddenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(KEY);
    const ids = raw ? JSON.parse(raw) as string[] : [];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export default function PersonalDueBanner({ tasks }: { tasks: PersonalTask[] }) {
  const [hide, setHide] = useState<Set<string>>(new Set());

  useEffect(() => { setHide(hiddenIds()); }, []);

  const due = tasks.filter(task => {
    if (task.done_at || !task.remind_at || hide.has(task.id)) return false;
    return new Date(task.remind_at).getTime() <= Date.now();
  });
  if (due.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(hide);
    next.add(id);
    setHide(next);
    try { sessionStorage.setItem(KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  };

  return (
    <div className="mb-5 flex flex-col gap-2">
      {due.map(task => (
        <div key={task.id} className="rounded-row bg-surface-soft p-4">
          <div className="flex items-start gap-2">
            <Bell size={18} strokeWidth={2.2} className="mt-0.5 shrink-0" />
            <button
              type="button"
              onClick={() => shallowSet({ tarea: task.id })}
              className="min-w-0 flex-1 text-left"
            >
              <div className="text-body font-extrabold tracking-[-.01em]">Tarea</div>
              <p className="mt-1 text-label font-medium leading-snug text-ink-2">{task.title}</p>
            </button>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(task.id)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-icon text-ink-3"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
