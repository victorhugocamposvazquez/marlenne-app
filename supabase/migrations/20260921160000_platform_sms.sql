-- Consola plataforma + SMS multi-centro (LabsMobile)

create table if not exists public.platform_admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is 'Operadores Marlén (consola SaaS).';

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where id = auth.uid());
$$;

alter table public.platform_admins enable row level security;

create policy platform_admins_self on public.platform_admins
  for select using (id = auth.uid() or public.is_platform_admin());

create table if not exists public.sms_config (
  salon_id              uuid primary key references public.salons(id) on delete cascade,
  enabled               boolean not null default true,
  reminder_mode         text not null default 'day_before_at_hour'
    check (reminder_mode in ('hours_before', 'day_before_at_hour')),
  reminder_hours_before int not null default 24
    check (reminder_hours_before between 1 and 168),
  reminder_send_hour    int not null default 21
    check (reminder_send_hour between 0 and 23),
  timezone              text not null default 'Europe/Madrid',
  test_mode             boolean not null default true,
  sender                text,
  updated_at            timestamptz default now()
);

insert into public.sms_config (salon_id)
select id from public.salons
on conflict (salon_id) do nothing;

create table if not exists public.sms_templates (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references public.salons(id) on delete cascade,
  clave      text not null,
  nombre     text not null,
  cuerpo     text not null,
  activa     boolean not null default true,
  updated_at timestamptz default now(),
  unique (salon_id, clave)
);

insert into public.sms_templates (salon_id, clave, nombre, cuerpo)
select
  s.id,
  'recordatorio_cita',
  'Recordatorio de cita',
  'Hola {{cliente}}, te recordamos tu cita de {{servicio}} el {{dia}} {{fecha}} a las {{hora}}. ¡Te esperamos!'
from public.salons s
on conflict (salon_id, clave) do nothing;

create table if not exists public.sms_service_aliases (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references public.salons(id) on delete cascade,
  clave      text not null,
  nombre_sms text not null,
  unique (salon_id, clave)
);

alter table public.appointments
  add column if not exists reminder_due_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists reminder_skipped_reason text,
  add column if not exists reminder_skipped_phone text;

create index if not exists idx_appointments_reminder
  on public.appointments (reminder_due_at)
  where reminder_sent_at is null and status = 'prog';

alter table public.sms_log
  add column if not exists salon_id uuid references public.salons(id) on delete cascade,
  add column if not exists provider text default 'labsmobile',
  add column if not exists provider_subid text,
  add column if not exists template_key text,
  add column if not exists simulated boolean not null default false,
  add column if not exists origin text not null default 'automatico'
    check (origin in ('automatico', 'prueba')),
  add column if not exists delivered_at timestamptz,
  add column if not exists error_message text;

update public.sms_log sl
set salon_id = a.salon_id
from public.appointments a
where a.id = sl.appointment_id
  and sl.salon_id is null;

create index if not exists idx_sms_log_salon_created
  on public.sms_log (salon_id, created_at desc);

create index if not exists idx_sms_log_provider_subid
  on public.sms_log (provider_subid)
  where provider_subid is not null;

create table if not exists public.platform_cron_runs (
  id       uuid primary key default gen_random_uuid(),
  job      text not null,
  ok       boolean not null,
  summary  jsonb not null default '{}',
  ran_at   timestamptz not null default now()
);

create index if not exists idx_platform_cron_runs_ran_at
  on public.platform_cron_runs (ran_at desc);

alter table public.sms_config enable row level security;
alter table public.sms_templates enable row level security;
alter table public.sms_service_aliases enable row level security;
alter table public.platform_cron_runs enable row level security;

create policy sms_config_admin on public.sms_config
  for all
  using (salon_id = public.my_salon() and public.my_role() = 'admin')
  with check (salon_id = public.my_salon() and public.my_role() = 'admin');

create policy sms_config_platform on public.sms_config
  for select using (public.is_platform_admin());

create policy sms_templates_admin on public.sms_templates
  for all
  using (salon_id = public.my_salon() and public.my_role() = 'admin')
  with check (salon_id = public.my_salon() and public.my_role() = 'admin');

create policy sms_templates_platform on public.sms_templates
  for select using (public.is_platform_admin());

create policy sms_aliases_admin on public.sms_service_aliases
  for all
  using (salon_id = public.my_salon() and public.my_role() = 'admin')
  with check (salon_id = public.my_salon() and public.my_role() = 'admin');

create policy sms_aliases_platform on public.sms_service_aliases
  for select using (public.is_platform_admin());

create policy platform_salons_read on public.salons
  for select using (public.is_platform_admin());

create policy platform_staff_read on public.staff
  for select using (public.is_platform_admin());

create policy platform_appointments_read on public.appointments
  for select using (public.is_platform_admin());

create policy platform_clients_read on public.clients
  for select using (public.is_platform_admin());

create policy platform_sms_log_read on public.sms_log
  for select using (public.is_platform_admin());

create policy platform_cron_runs_read on public.platform_cron_runs
  for select using (public.is_platform_admin());

grant all on table public.platform_admins to service_role;
grant all on table public.sms_config to service_role;
grant all on table public.sms_templates to service_role;
grant all on table public.sms_service_aliases to service_role;
grant all on table public.platform_cron_runs to service_role;
