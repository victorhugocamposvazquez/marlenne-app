-- Enlaces de reserva con modo de cobro + intents Stripe + ledger de liquidación.

create extension if not exists pgcrypto;

alter table public.appointments
  add column if not exists booking_link_id uuid;

alter table public.appointments
  add column if not exists stripe_checkout_session_id text;

alter table public.appointments
  add column if not exists stripe_payment_intent_id text;

create table if not exists public.booking_links (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  link_key text not null,
  label text,
  custom_title text,
  service_id uuid references public.services(id) on delete set null,
  provider_id uuid references public.staff(id) on delete set null,
  payment_mode text not null default 'free'
    check (payment_mode in ('free', 'pay_full', 'pay_deposit')),
  deposit_bps int not null default 3000
    check (deposit_bps >= 500 and deposit_bps <= 10000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, link_key)
);

create index if not exists booking_links_salon_idx on public.booking_links (salon_id);
create index if not exists booking_links_key_idx on public.booking_links (link_key);

comment on table public.booking_links is
  'Presets de enlace público: free | pay_full | pay_deposit.';

alter table public.appointments
  drop constraint if exists appointments_booking_link_id_fkey;

alter table public.appointments
  add constraint appointments_booking_link_id_fkey
  foreign key (booking_link_id) references public.booking_links(id) on delete set null;

create table if not exists public.booking_intents (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  booking_link_id uuid references public.booking_links(id) on delete set null,
  service_id uuid not null references public.services(id) on delete cascade,
  provider_id uuid references public.staff(id) on delete set null,
  starts_at timestamptz not null,
  duration_min int not null check (duration_min > 0),
  price_cents int not null check (price_cents >= 0),
  charge_cents int not null check (charge_cents >= 0),
  payment_mode text not null
    check (payment_mode in ('pay_full', 'pay_deposit')),
  full_name text not null,
  phone text not null,
  email text,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'expired', 'cancelled', 'failed')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  appointment_id uuid references public.appointments(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_intents_salon_status_idx
  on public.booking_intents (salon_id, status);
create index if not exists booking_intents_expires_idx
  on public.booking_intents (expires_at)
  where status = 'pending';

create table if not exists public.salon_booking_ledger (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  booking_intent_id uuid references public.booking_intents(id) on delete set null,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'eur',
  stripe_payment_intent_id text,
  status text not null default 'pending'
    check (status in ('pending', 'settled', 'refunded')),
  settled_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists salon_booking_ledger_salon_idx
  on public.salon_booking_ledger (salon_id, status);

alter table public.booking_links enable row level security;
alter table public.booking_intents enable row level security;
alter table public.salon_booking_ledger enable row level security;

-- Staff del salón (admin/reception) puede gestionar links; intents/ledger solo service role vía API.
drop policy if exists booking_links_salon_select on public.booking_links;
create policy booking_links_salon_select on public.booking_links
  for select to authenticated
  using (salon_id = my_salon());

drop policy if exists booking_links_salon_write on public.booking_links;
create policy booking_links_salon_write on public.booking_links
  for all to authenticated
  using (salon_id = my_salon() and my_role() = 'admin')
  with check (salon_id = my_salon() and my_role() = 'admin');

-- Lectura pública de link activo vía RPC (abajo); sin policy anon directa.

create or replace function public.booking_link_by_key(p_salon_slug text, p_link_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.salons;
  l public.booking_links;
begin
  s := private.booking_salon_by_slug(p_salon_slug);
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select * into l
    from public.booking_links bl
   where bl.salon_id = s.id
     and bl.link_key = lower(trim(p_link_key))
     and bl.active;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'link');
  end if;

  return jsonb_build_object(
    'ok', true,
    'link', jsonb_build_object(
      'id', l.id,
      'key', l.link_key,
      'label', l.label,
      'custom_title', l.custom_title,
      'service_id', l.service_id,
      'provider_id', l.provider_id,
      'payment_mode', l.payment_mode,
      'deposit_bps', l.deposit_bps
    )
  );
end;
$$;

revoke all on function public.booking_link_by_key(text, text) from public;
grant execute on function public.booking_link_by_key(text, text) to anon, authenticated, service_role;
