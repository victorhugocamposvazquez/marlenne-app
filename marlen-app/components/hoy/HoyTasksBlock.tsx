'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Check, ChevronRight, Lock, ListTodo } from 'lucide-react';
import { setUnifiedTaskDone } from '@/app/actions/tasks';
import { shallowSet } from '@/hooks/useShallowQuery';
import type { UnifiedTask } from '@/lib/tasks';

export default function HoyTasksBlock({ tasks }: { tasks: UnifiedTask[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const open = tasks.filter(t => !t.done_at);
  const shown = (open.length ? open : tasks).slice(0, 5);

  return (
    <section className="mb-5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-ink">Tareas de hoy</h2>
        <Link
          href="/tareas"
          className="flex items-center gap-0.5 text-[13px] font-bold text-v-2 no-underline"
        >
          Ver todas
          <ChevronRight size={16} strokeWidth={2.4} />
        </Link>
      </div>

      {shown.length === 0 ? (
        <button
          type="button"
          onClick={() => shallowSet({ tarea: '1', scope: 'centro' })}
          className="flex w-full items-center gap-3 rounded-row border border-dashed border-surface-line bg-white px-4 py-3.5 text-left"
        >
          <span className="grid h-9 w-9 place-items-center rounded-pill bg-[#E8F2FF] text-v-2">
            <ListTodo size={18} strokeWidth={2} />
          </span>
          <span className="text-[14px] font-semibold text-ink-2">Nada para hoy · añadir tarea</span>
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map(task => (
            <div
              key={`${task.scope}-${task.id}`}
              className="flex items-center gap-3 rounded-row border border-surface-line bg-white px-3.5 py-3"
            >
              <button
                type="button"
                disabled={pending}
                aria-label={task.done_at ? 'Marcar pendiente' : 'Marcar hecha'}
                onClick={() => {
                  start(async () => {
                    await setUnifiedTaskDone(task.id, task.scope, !task.done_at);
                    router.refresh();
                  });
                }}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-pill ${
                  task.done_at
                    ? task.scope === 'personal' ? 'bg-v-2' : 'bg-ink'
                    : task.scope === 'personal'
                      ? 'border-2 border-[#8FC1FF] bg-white'
                      : 'border-2 border-[#D9D8E0] bg-white'
                }`}
              >
                {task.done_at && <Check size={11} strokeWidth={3.4} className="text-white" />}
              </button>
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => shallowSet({ tarea: task.id, scope: task.scope })}
              >
                <span className={`block text-[14.5px] font-semibold ${task.done_at ? 'text-ink-3 line-through' : 'text-ink'}`}>
                  {task.title}
                </span>
              </button>
              {task.scope === 'personal' ? (
                <span className="flex shrink-0 items-center gap-1 rounded-pill bg-[#E8F2FF] px-2 py-1 text-[10.5px] font-bold text-[#0463D1]">
                  <Lock size={10} strokeWidth={2.4} />
                  Solo tú
                </span>
              ) : task.assignee_name ? (
                <span className="shrink-0 text-[11px] font-semibold text-ink-3">{task.assignee_name.split(' ')[0]}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
