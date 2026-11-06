-- Pedidos de tarjeta regalo vendidos desde la web pública.

create table if not exists public.gift_orders (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  amount_cents int not null check (amount_cents >= 500),
  code text not null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  recipient_name text,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'failed')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gift_orders_code_unique unique (salon_id, code)
);

create index if not exists gift_orders_salon_created_idx
  on public.gift_orders (salon_id, created_at desc);

comment on table public.gift_orders is
  'Tarjetas regalo compradas en la web del centro (Stripe Checkout).';

alter table public.gift_orders enable row level security;

drop policy if exists gift_orders_staff_read on public.gift_orders;
create policy gift_orders_staff_read on public.gift_orders for select
  using (salon_id = my_salon());

drop policy if exists gift_orders_staff_write on public.gift_orders;
create policy gift_orders_staff_write on public.gift_orders for all
  using (salon_id = my_salon() and my_role() = 'admin')
  with check (salon_id = my_salon() and my_role() = 'admin');

grant select, insert, update, delete on public.gift_orders to authenticated;
