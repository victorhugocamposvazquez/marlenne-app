-- Entrada Ops al salón (token de un uso) y registro de acciones en modo soporte.
-- staff_user_id sin FK: evita fallos si el SQL se pega mal (p. ej. "sxataff").

create table if not exists ops_support_token (
  jti           text primary key,
  salon_id      uuid not null references public.salons(id) on delete cascade,
  ops_email     text not null,
  expires_at    timestamptz not null,
  consumed_at   timestamptz
);
create index if not exists ops_support_token_open on ops_support_token (expires_at)
  where consumed_at is null;

create table if not exists ops_support_audit (
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
create index if not exists ops_support_audit_salon_time on ops_support_audit (salon_id, created_at desc);

alter table ops_support_token enable row level security;
alter table ops_support_audit enable row level security;

-- Solo backend (service role); la app y el panel escriben con service role.
