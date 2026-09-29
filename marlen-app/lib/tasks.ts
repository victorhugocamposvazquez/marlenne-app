/** Tareas unificadas: centro (salón) + personales. Sin DOM ni next/*. */

import { dayKey } from '@/lib/time';
import type { RemindChoice } from '@/lib/personal-tasks';

export type TaskScope = 'centro' | 'personal';
export type TaskFilter = 'todas' | 'centro' | 'personal';

export type UnifiedTask = {
  id: string;
  scope: TaskScope;
  title: string;
  note: string | null;
  due_at: string | null;
  done_at: string | null;
  remind_at: string | null;
  /** Solo centro */
  assignee_staff_id: string | null;
  assignee_name: string | null;
};

export function taskDueDay(task: UnifiedTask): string | null {
  return task.due_at ? dayKey(task.due_at) : null;
}

export function filterTasks(
  tasks: UnifiedTask[],
  scope: TaskFilter,
  day?: string | null,
): UnifiedTask[] {
  return tasks.filter(t => {
    if (scope !== 'todas' && t.scope !== scope) return false;
    if (day) {
      const d = taskDueDay(t);
      if (d !== day) return false;
    }
    return true;
  });
}

export function tasksForDay(tasks: UnifiedTask[], day: string): UnifiedTask[] {
  return filterTasks(tasks, 'todas', day).sort((a, b) => {
    if (Boolean(a.done_at) !== Boolean(b.done_at)) return a.done_at ? 1 : -1;
    const ta = a.due_at ? +new Date(a.due_at) : 0;
    const tb = b.due_at ? +new Date(b.due_at) : 0;
    return ta - tb;
  });
}

/** Pendientes de hoy o atrasadas (para el bloque de Hoy). */
export function tasksDueTodayOrOverdue(tasks: UnifiedTask[], todayKey: string): UnifiedTask[] {
  return tasks
    .filter(t => {
      const d = taskDueDay(t);
      if (!d) return false;
      if (t.done_at) return d === todayKey;
      return d <= todayKey;
    })
    .sort((a, b) => {
      if (Boolean(a.done_at) !== Boolean(b.done_at)) return a.done_at ? 1 : -1;
      const ta = a.due_at ? +new Date(a.due_at) : 0;
      const tb = b.due_at ? +new Date(b.due_at) : 0;
      return ta - tb;
    });
}

export type { RemindChoice };
