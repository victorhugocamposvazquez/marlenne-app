import PersonalDueBanner from '@/components/personal/PersonalDueBanner';
import PersonalHeader from '@/components/personal/PersonalHeader';
import TaskRow from '@/components/personal/TaskRow';
import StaffReminderBanner from '@/components/StaffReminderBanner';
import { listPersonalTasks } from '@/app/actions/personal-tasks';
import { personalHomeSections } from '@/lib/personal-tasks';
import { requireSession } from '@/lib/require-session';
import { dayKey } from '@/lib/time';

export default async function PersonalHome() {
  const me = await requireSession();
  const tasks = await listPersonalTasks();
  const todayKey = dayKey(new Date());
  const first = me.full_name.trim().split(/\s+/)[0] ?? me.full_name;
  const sections = personalHomeSections(tasks, todayKey);

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-[22px] pb-fab pt-7">
      <PersonalHeader greeting={`Hola ${first}`} title="Hoy" dateIso={todayKey} />
      <PersonalDueBanner tasks={tasks} />
      <StaffReminderBanner
        title="Avisos de tus tareas"
        body="Te avisamos a la hora que elijas, también con la app cerrada si activas las notificaciones."
      />
      {sections.map(sec => (
        <section key={sec.id} className="mt-[26px] first:mt-0">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[17px] font-bold tracking-[-.02em]">{sec.title}</h2>
            {sec.tasks.length > 0 && (
              <span className="text-[13px] font-semibold text-ink-3">{sec.tasks.length}</span>
            )}
          </div>
          {sec.tasks.length === 0 && sec.emptyMsg && (
            <p className="mt-2.5 text-[14px] text-ink-2">{sec.emptyMsg}</p>
          )}
          {sec.tasks.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-2">
              {sec.tasks.map(task => (
                <TaskRow key={task.id} task={task} todayKey={todayKey} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
