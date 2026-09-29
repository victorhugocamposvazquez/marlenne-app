import { Suspense } from 'react';
import TareasView from '@/components/tareas/TareasView';
import { listUnifiedTasks } from '@/app/actions/tasks';
import { requireSession } from '@/lib/require-session';
import { dayKey } from '@/lib/time';

export default async function TareasPage() {
  await requireSession();
  const tasks = await listUnifiedTasks('todas');
  const todayKey = dayKey(new Date());

  return (
    <Suspense fallback={(
      <div className="flex flex-1 items-center justify-center">
        <p className="text-body font-semibold text-ink-2">Cargando…</p>
      </div>
    )}
    >
      <TareasView tasks={tasks} todayKey={todayKey} />
    </Suspense>
  );
}
