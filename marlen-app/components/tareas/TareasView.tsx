'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useTransition } from 'react';
import { Check, ChevronLeft, ChevronRight, Lock, Plus } from 'lucide-react';
import { setUnifiedTaskDone } from '@/app/actions/tasks';
import { shallowSet } from '@/hooks/useShallowQuery';
import { monthCells, shiftMonth } from '@/lib/personal-tasks';
import { filterTasks, taskDueDay, type TaskFilter, type UnifiedTask } from '@/lib/tasks';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DOWS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function TareasView({
  tasks,
  todayKey,
}: {
  tasks: UnifiedTask[];
  todayKey: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const scope = (['todas', 'centro', 'personal'].includes(sp.get('scope') ?? '')
    ? sp.get('scope')
    : 'todas') as TaskFilter;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.get('dia') ?? '') ? sp.get('dia')! : todayKey;
  const monthOff = Number(sp.get('mes') ?? 0) || 0;
  const [pending, start] = useTransition();

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `/tareas?${qs}` : '/tareas', { scroll: false });
  };

  const list = filterTasks(tasks, scope, day);
  const baseY = Number(todayKey.slice(0, 4));
  const baseM = Number(todayKey.slice(5, 7));
  const view = useMemo(() => shiftMonth(baseY, baseM, monthOff), [baseY, baseM, monthOff]);
  const cells = useMemo(() => monthCells(view.year, view.month), [view.year, view.month]);
  const d = new Date(`${day}T12:00:00`);
  const dayLabel = day === todayKey
    ? 'Hoy'
    : `${DOWS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3).toLowerCase()}`;

  const toggle = (task: UnifiedTask) => {
    start(async () => {
      await setUnifiedTaskDone(task.id, task.scope, !task.done_at);
      router.refresh();
    });
  };

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-6 pb-3 pt-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-extrabold tracking-[-.03em] text-ink">Tareas</h1>
            <p className="mt-0.5 text-[13.5px] font-medium text-ink-2">Del centro y tuyas</p>
          </div>
          <div className="flex rounded-pill bg-track p-0.5">
            {([['todas', 'Todas'], ['centro', 'Del centro'], ['personal', 'Personales']] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setParams({ scope: k === 'todas' ? null : k })}
                className={`h-9 rounded-pill px-3.5 text-[13px] font-bold ${
                  scope === k ? 'bg-ink text-white' : 'text-ink-2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => shallowSet({
              tarea: '1',
              scope: scope === 'personal' ? 'personal' : 'centro',
            })}
            className="flex h-11 items-center gap-1.5 rounded-pill bg-v-2 px-4 text-[13.5px] font-bold text-white"
          >
            <Plus size={16} strokeWidth={2.6} />
            Nueva tarea
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          <div className="rounded-card border border-surface-line bg-white p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setParams({ mes: String(monthOff - 1) })}
                className="grid h-9 w-9 place-items-center rounded-pill bg-track"
              >
                <ChevronLeft size={14} strokeWidth={2.8} />
              </button>
              <span className="text-[14.5px] font-bold">
                {MESES[view.month - 1]} {view.year}
              </span>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => setParams({ mes: String(monthOff + 1) })}
                className="grid h-9 w-9 place-items-center rounded-pill bg-track"
              >
                <ChevronRight size={14} strokeWidth={2.8} />
              </button>
            </div>
            <div className="mt-2.5 grid grid-cols-7">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(w => (
                <span key={w} className="py-1 text-center text-[10.5px] font-bold text-[#B7B4C4]">{w}</span>
              ))}
              {cells.map(cell => {
                const sel = cell.key === day;
                const tod = cell.key === todayKey;
                const nPend = filterTasks(tasks, scope, cell.key).filter(t => !t.done_at).length;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setParams({ dia: cell.key === todayKey ? null : cell.key })}
                    className="flex h-10 items-center justify-center"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-pill text-[13px] ${
                        sel
                          ? 'bg-v-2 font-bold text-white'
                          : nPend
                            ? 'bg-[#E8F2FF] font-bold text-[#0463D1]'
                            : tod
                              ? 'font-bold text-ink shadow-[inset_0_0_0_2px_rgb(var(--c-brand-2))]'
                              : 'font-medium text-ink'
                      }`}
                    >
                      {Number(cell.key.slice(8))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="px-0.5 text-[16px] font-bold text-ink">{dayLabel}</h2>
            {list.map(task => (
              <div
                key={`${task.scope}-${task.id}`}
                className="flex items-center gap-3 rounded-row border border-surface-line bg-white px-3.5 py-3"
              >
                <button
                  type="button"
                  disabled={pending}
                  aria-label={task.done_at ? 'Marcar pendiente' : 'Marcar hecha'}
                  onClick={() => toggle(task)}
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
                  {taskDueDay(task) && (
                    <span className="mt-0.5 block text-[12px] font-medium text-ink-3">
                      {task.due_at
                        ? new Date(task.due_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Madrid',
                        })
                        : null}
                    </span>
                  )}
                </button>
                {task.scope === 'personal' ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-pill bg-[#E8F2FF] px-2.5 py-1 text-[11px] font-bold text-[#0463D1]">
                    <Lock size={11} strokeWidth={2.4} />
                    Solo tú
                  </span>
                ) : (
                  <span className="shrink-0 text-[11.5px] font-semibold text-ink-3">
                    {task.assignee_name ?? 'Equipo'}
                  </span>
                )}
              </div>
            ))}
            {!list.length && (
              <p className="px-0.5 py-2 text-[13.5px] font-medium text-ink-2">Nada este día.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
