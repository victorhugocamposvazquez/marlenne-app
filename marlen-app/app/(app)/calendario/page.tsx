import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { listPersonalTasks } from '@/app/actions/personal-tasks';
import TaskRow from '@/components/personal/TaskRow';
import PageHeading from '@/components/ui/PageHeading';
import { requireSession } from '@/lib/require-session';
import { monthCells, shiftMonth } from '@/lib/personal-tasks';
import { dayKey } from '@/lib/time';

function parseMonth(raw: string | undefined, todayKey: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(raw ?? '');
  if (match) return { year: Number(match[1]), month: Number(match[2]) };
  return { year: Number(todayKey.slice(0, 4)), month: Number(todayKey.slice(5, 7)) };
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { mes?: string; dia?: string };
}) {
  const me = await requireSession();
  if (me.workspace !== 'personal') redirect('/agenda');

  const todayKey = dayKey(new Date());
  const { year, month } = parseMonth(searchParams.mes, todayKey);
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia ?? '') ? searchParams.dia! : todayKey;
  const tasks = await listPersonalTasks();
  const marked = new Set(tasks.filter(t => t.due_at && !t.done_at).map(t => dayKey(t.due_at!)));
  const dayTasks = tasks.filter(t => t.due_at && dayKey(t.due_at) === selected && !t.done_at);
  const cells = monthCells(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-ES', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  const mes = `${year}-${String(month).padStart(2, '0')}`;
  const href = (y: number, m: number) => {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    return `/calendario?mes=${key}&dia=${selected}`;
  };

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-fab pt-5">
      <div className="mb-4">
        <PageHeading title="Calendario" kicker={<span className="text-body font-medium text-ink-2">Personal</span>} />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <Link href={href(prev.year, prev.month)} aria-label="Mes anterior" className="grid h-11 w-11 place-items-center text-ink">
          <ChevronLeft size={22} strokeWidth={2.2} />
        </Link>
        <div className="text-body-lg font-bold capitalize">{label}</div>
        <Link href={href(next.year, next.month)} aria-label="Mes siguiente" className="grid h-11 w-11 place-items-center text-ink">
          <ChevronRight size={22} strokeWidth={2.2} />
        </Link>
      </div>
      <div className="mb-2 grid grid-cols-7 text-center text-caption font-bold uppercase text-ink-3">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="mb-6 grid grid-cols-7 gap-y-1">
        {cells.map(cell => {
          const on = cell.key === selected;
          const has = marked.has(cell.key);
          return (
            <Link
              key={cell.key}
              href={`/calendario?mes=${mes}&dia=${cell.key}`}
              className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full text-body font-bold no-underline ${on ? 'bg-ink text-white' : cell.inMonth ? 'text-ink' : 'text-ink-3'}`}
            >
              {Number(cell.key.slice(8))}
              {has && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${on ? 'bg-white' : 'bg-v'}`} />}
            </Link>
          );
        })}
      </div>
      <h2 className="mb-1 text-body-lg font-bold">
        {selected === todayKey ? 'Hoy' : new Date(`${selected}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
      </h2>
      {dayTasks.length === 0 ? (
        <p className="text-label font-medium text-ink-2">Sin tareas este día.</p>
      ) : (
        <div className="rounded-row bg-surface-soft px-4">
          {dayTasks.map(task => <TaskRow key={task.id} task={task} todayKey={todayKey} />)}
        </div>
      )}
    </div>
  );
}
