-- Cuenta personal: otro salón del mismo login, sin mezclarlo con my_salon() del centro.

alter table public.salons
  add column if not exists kind text not null default 'company',
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

alter table public.salons drop constraint if exists salons_kind_check;
alter table public.salons
  add constraint salons_kind_check check (kind in ('company', 'personal'));

create unique index if not exists salons_personal_owner_uidx
  on public.salons (owner_user_id)
  where kind = 'personal';

create table if not exists public.personal_tasks (
  id           uuid primary key default uuid_generate_v4(),
  salon_id     uuid not null references public.salons(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  note         text,
  due_at       timestamptz,
  done_at      timestamptz,
  remind_at    timestamptz,
  reminded_at  timestamptz,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists personal_tasks_user_idx
  on public.personal_tasks (user_id, done_at, due_at);

create index if not exists personal_tasks_remind_due
  on public.personal_tasks (remind_at)
  where reminded_at is null and done_at is null and remind_at is not null;

alter table public.personal_tasks enable row level security;

drop policy if exists personal_tasks_own on public.personal_tasks;
create policy personal_tasks_own on public.personal_tasks
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.personal_tasks to authenticated;
