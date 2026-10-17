-- Tareas del centro (salón). Las personales siguen en personal_tasks.

create table if not exists public.salon_tasks (
  id                 uuid primary key default uuid_generate_v4(),
  salon_id           uuid not null references public.salons(id) on delete cascade,
  created_by         uuid not null references auth.users(id) on delete cascade,
  assignee_staff_id  uuid references public.staff(id) on delete set null,
  title              text not null,
  note               text,
  due_at             timestamptz,
  done_at            timestamptz,
  remind_at          timestamptz,
  reminded_at        timestamptz,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists salon_tasks_salon_due_idx
  on public.salon_tasks (salon_id, done_at, due_at);

create index if not exists salon_tasks_assignee_idx
  on public.salon_tasks (assignee_staff_id)
  where assignee_staff_id is not null;

alter table public.salon_tasks enable row level security;

drop policy if exists salon_tasks_salon on public.salon_tasks;
create policy salon_tasks_salon on public.salon_tasks
  for all
  using (salon_id = my_salon())
  with check (salon_id = my_salon());

grant select, insert, update, delete on public.salon_tasks to authenticated;
