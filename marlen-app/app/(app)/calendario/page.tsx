import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import PersonalCalendarView from '@/components/personal/PersonalCalendarView';
import { listPersonalTasks } from '@/app/actions/personal-tasks';
import { requireSession } from '@/lib/require-session';
import { dayKey } from '@/lib/time';

export default async function CalendarioPage() {
  const me = await requireSession();
  if (me.workspace !== 'personal') redirect('/agenda');

  const tasks = await listPersonalTasks();
  const todayKey = dayKey(new Date());
  const first = me.full_name.trim().split(/\s+/)[0] ?? me.full_name;

  return (
    <Suspense fallback={(
      <div className="flex flex-1 items-center justify-center pb-fab">
        <p className="text-body font-semibold text-ink-2">Cargando…</p>
      </div>
    )}
    >
      <PersonalCalendarView tasks={tasks} todayKey={todayKey} greeting={`Hola ${first}`} />
    </Suspense>
  );
}
