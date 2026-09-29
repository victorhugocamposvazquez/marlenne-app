-- Si la migración ops_support falló a medias (typo sxataff, etc.), ejecuta esto en el SQL Editor.

drop table if exists public.ops_support_audit;
drop table if exists public.ops_support_token;

create table public.ops_support_token (
  jti           text primary key,
  salon_id      uuid not null references public.salons(id) on delete cascade,
  ops_email     text not null,
  expires_at    timestamptz not null,
  consumed_at   timestamptz
);
create index ops_support_token_open on public.ops_support_token (expires_at)
  where consumed_at is null;

create table public.ops_support_audit (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references public.salons(id) on delete cascade,
  ops_email       text not null,
  company_label   text not null,
  staff_user_id   uuid,
  staff_name      text,
  action          text not null,
  detail          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index ops_support_audit_salon_time on public.ops_support_audit (salon_id, created_at desc);

alter table public.ops_support_token enable row level security;
alter table public.ops_support_audit enable row level security;
