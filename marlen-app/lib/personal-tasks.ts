/** Tareas de la cuenta personal. Sin DOM ni next/*. */

import { dayKey, toTimestamp } from '@/lib/time';

export type WorkspaceKind = 'company' | 'personal';
export type TaskBucket = 'hoy' | 'manana' | 'semana' | 'despues' | 'hechas';
export type RemindChoice = 'none' | 'at' | '15' | '60' | 'day';

export type PersonalTask = {
  id: string;
  title: string;
  note: string | null;
  due_at: string | null;
  done_at: string | null;
  remind_at: string | null;
  reminded_at: string | null;
  sort_order: number;
};

export const TASK_BUCKETS: { id: TaskBucket; title: string }[] = [
  { id: 'hoy', title: 'Hoy' },
  { id: 'manana', title: 'Mañana' },
  { id: 'semana', title: 'Esta semana' },
  { id: 'despues', title: 'Más adelante' },
  { id: 'hechas', title: 'Hechas' },
];

export function workspaceFromPrefs(raw: unknown): WorkspaceKind {
  if (!raw || typeof raw !== 'object') return 'company';
  return (raw as { workspace?: unknown }).workspace === 'personal' ? 'personal' : 'company';
}

export function personalSalonIdFromPrefs(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = (raw as { personal_salon_id?: unknown }).personal_salon_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + n));
  return utc.toISOString().slice(0, 10);
}

function mondayKey(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const dow = (utc.getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}

export function taskBucket(
  task: { due_at: string | null; done_at: string | null },
  todayKey: string,
): TaskBucket {
  if (task.done_at) return 'hechas';
  if (!task.due_at) return 'semana';
  const key = dayKey(task.due_at);
  if (key <= todayKey) return 'hoy';
  if (key === addDays(todayKey, 1)) return 'manana';
  if (key <= addDays(mondayKey(todayKey), 6)) return 'semana';
  return 'despues';
}

export function dueTimestamp(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const mins = match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  if (mins < 0 || mins >= 24 * 60) return null;
  return toTimestamp(date, mins);
}

export function remindTimestamp(dueAt: string | null, choice: RemindChoice, hasTime: boolean): string | null {
  if (!dueAt || choice === 'none') return null;
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return null;
  if (!hasTime && (choice === '15' || choice === '60' || choice === 'at')) {
    const atNine = toTimestamp(dayKey(dueAt), 9 * 60);
    if (choice === 'at') return atNine;
    return choice === '15'
      ? new Date(new Date(atNine).getTime() - 15 * 60_000).toISOString()
      : new Date(new Date(atNine).getTime() - 60 * 60_000).toISOString();
  }
  if (choice === 'at') return new Date(due).toISOString();
  if (choice === '15') return new Date(due - 15 * 60_000).toISOString();
  if (choice === '60') return new Date(due - 60 * 60_000).toISOString();
  return new Date(due - 24 * 60 * 60_000).toISOString();
}

export function monthCells(year: number, month: number): { key: string; inMonth: boolean }[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const start = mondayKey(first);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const cells: { key: string; inMonth: boolean }[] = [];
  let cursor = start;
  while (cells.length < 42) {
    cells.push({ key: cursor, inMonth: cursor.slice(0, 7) === first.slice(0, 7) });
    cursor = addDays(cursor, 1);
    if (cells.length >= 35 && cursor > last && cells.length % 7 === 0) break;
  }
  return cells;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const utc = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1 };
}

const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** Etiqueta corta de cuándo vence la tarea (estilo referencia personal). */
export function taskWhenLabel(dueAt: string | null, todayKey: string, time?: string | null): string {
  if (!dueAt) return '';
  const key = dayKey(dueAt);
  const [y, m, d] = key.split('-').map(Number);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const diff = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
  const base = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff === -1 ? 'Ayer'
    : `${d} ${MESES_C[m - 1]}${String(y) !== todayKey.slice(0, 4) ? ` ${y}` : ''}`;
  return time ? `${base} · ${time}` : base;
}

export type PersonalHomeSection = {
  id: string;
  title: string;
  tasks: PersonalTask[];
  emptyMsg?: string;
};

export function personalHomeSections(tasks: PersonalTask[], todayKey: string): PersonalHomeSection[] {
  const pend = tasks.filter(t => !t.done_at);
  const past = pend
    .filter(t => t.due_at && dayKey(t.due_at) < todayKey)
    .sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''));
  const today = pend
    .filter(t => !t.due_at || dayKey(t.due_at) === todayKey)
    .sort((a, b) => (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999'));
  const fut = pend
    .filter(t => t.due_at && dayKey(t.due_at) > todayKey)
    .sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''));
  const done = tasks
    .filter(t => t.done_at)
    .sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));

  const secs: PersonalHomeSection[] = [];
  if (past.length) secs.push({ id: 'past', title: 'Pendientes de días pasados', tasks: past });
  secs.push({
    id: 'hoy',
    title: 'Hoy',
    tasks: today,
    emptyMsg: 'Nada para hoy. El + de arriba crea una tarea.',
  });
  if (fut.length) secs.push({ id: 'fut', title: 'Más adelante', tasks: fut });
  if (done.length) secs.push({ id: 'hechas', title: 'Hechas', tasks: done });
  return secs;
}

export function remindChoiceLabel(remind: RemindChoice, hasTime: boolean): string {
  if (remind === 'none') return 'Sin aviso';
  if (remind === '15') return '15 min antes';
  if (remind === '60') return '1 h antes';
  if (remind === 'day') return '1 día antes';
  return hasTime ? 'A la hora' : 'Ese día a las 9:00';
}

export function remindFromLabel(label: string, hasTime: boolean): RemindChoice {
  if (label === 'Sin aviso') return 'none';
  if (label === '15 min antes') return '15';
  if (label === '1 h antes') return '60';
  if (label === '1 día antes') return 'day';
  if (label === 'A la hora' || label === 'Ese día a las 9:00') return 'at';
  return 'none';
}

/** Reconstruye el chip de aviso a partir de due_at / remind_at guardados. */
export function inferRemindChoice(
  dueAt: string | null,
  remindAt: string | null,
): RemindChoice {
  if (!dueAt || !remindAt) return 'none';
  const due = new Date(dueAt).getTime();
  const rem = new Date(remindAt).getTime();
  if (Number.isNaN(due) || Number.isNaN(rem)) return 'none';
  const delta = due - rem;
  if (Math.abs(delta) < 90_000) return 'at';
  if (Math.abs(delta - 15 * 60_000) < 90_000) return '15';
  if (Math.abs(delta - 60 * 60_000) < 90_000) return '60';
  if (Math.abs(delta - 24 * 60 * 60_000) < 90_000) return 'day';
  return 'at';
}
