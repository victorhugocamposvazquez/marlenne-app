import PageHeading from '@/components/ui/PageHeading';
import StaffReminderBanner from '@/components/StaffReminderBanner';
import PersonalDueBanner from '@/components/personal/PersonalDueBanner';
import TaskRow from '@/components/personal/TaskRow';
import { listPersonalTasks } from '@/app/actions/personal-tasks';
import { TASK_BUCKETS, taskBucket } from '@/lib/personal-tasks';
import { dayKey } from '@/lib/time';

export default async function PersonalHome() {
  const tasks = await listPersonalTasks();
  const todayKey = dayKey(new Date());
  const groups = TASK_BUCKETS.map(bucket => ({
    ...bucket,
    tasks: tasks
      .filter(task => taskBucket(task, todayKey) === bucket.id)
      .sort((a, b) => {
        if (bucket.id === 'hechas') return (b.done_at ?? '').localeCompare(a.done_at ?? '');
        return (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999');
      }),
  })).filter(group => group.id === 'hoy' || group.tasks.length > 0);

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-fab pt-5">
      <div className="mb-[18px]">
        <PageHeading title="Hoy" kicker={<span className="text-body font-medium text-ink-2">Personal</span>} />
      </div>
      <PersonalDueBanner tasks={tasks} />
      <StaffReminderBanner
        title="Avisos de tus tareas"
        body="Te avisamos a la hora que elijas, también con la app cerrada si activas las notificaciones."
      />
      <div className="flex flex-col gap-6">
        {groups.map(group => (
          <section key={group.id}>
            <h2 className="mb-1 text-body-lg font-bold tracking-[-.02em]">{group.title}</h2>
            {group.tasks.length === 0 ? (
              <p className="text-label font-medium text-ink-2">Nada para hoy. El + crea una tarea.</p>
            ) : (
              <div className="rounded-row bg-surface-soft px-4">
                {group.tasks.map(task => <TaskRow key={task.id} task={task} todayKey={todayKey} />)}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
