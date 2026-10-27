-- Alertas de monitorización Ops (dedupe por fingerprint).

create table if not exists public.platform_monitor_alerts (
  id           uuid primary key default gen_random_uuid(),
  fingerprint  text not null,
  check_key    text not null,
  salon_id     uuid references public.salons(id) on delete set null,
  severity     text not null default 'error'
    check (severity in ('info', 'warn', 'error')),
  title        text not null,
  detail       text,
  emailed_at   timestamptz,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (fingerprint)
);

create index if not exists platform_monitor_alerts_open_idx
  on public.platform_monitor_alerts (check_key, created_at desc)
  where resolved_at is null;

alter table public.platform_monitor_alerts enable row level security;

drop policy if exists platform_monitor_alerts_platform on public.platform_monitor_alerts;
create policy platform_monitor_alerts_platform on public.platform_monitor_alerts
  for select using (public.is_platform_admin());

grant select on public.platform_monitor_alerts to authenticated;
grant all on public.platform_monitor_alerts to service_role;
