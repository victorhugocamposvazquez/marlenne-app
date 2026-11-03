-- Log de correos transaccionales (Brevo) para ops / cupos.

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'brevo'
    check (provider in ('brevo', 'resend')),
  kind text not null default 'generic',
  to_email text not null,
  subject text,
  status text not null default 'sent'
    check (status in ('sent', 'failed')),
  provider_message_id text,
  error text,
  salon_id uuid references public.salons(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_log_created_idx on public.email_log (created_at desc);
create index if not exists email_log_status_day_idx on public.email_log (status, created_at desc);
create index if not exists email_log_salon_idx on public.email_log (salon_id, created_at desc);

comment on table public.email_log is
  'Envíos de correo de la plataforma (confirmaciones booking, alertas ops, etc.).';

alter table public.email_log enable row level security;

-- Sin policies para authenticated: solo service role / admin API.
