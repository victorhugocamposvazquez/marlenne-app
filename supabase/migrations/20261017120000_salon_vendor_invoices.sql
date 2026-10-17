-- Facturas de proveedores (Amazon Business / Meta) por salón + contacto gestoría.

alter table public.salons
  add column if not exists gestoria_email text;

alter table public.salons
  add column if not exists gestoria_whatsapp text;

comment on column public.salons.gestoria_email is
  'Email de la gestoría para envío de ZIP de facturas de proveedores.';
comment on column public.salons.gestoria_whatsapp is
  'Móvil de gestoría (WhatsApp) para compartir facturas.';

create table if not exists public.salon_vendor_connections (
  id                   uuid primary key default uuid_generate_v4(),
  salon_id             uuid not null references public.salons(id) on delete cascade,
  vendor               text not null check (vendor in ('amazon_business', 'meta')),
  status               text not null default 'disconnected'
    check (status in ('disconnected', 'connected', 'error')),
  external_account_id  text,
  access_token_enc     text,
  refresh_token_enc    text,
  token_expires_at     timestamptz,
  meta                 jsonb not null default '{}'::jsonb,
  connected_at         timestamptz,
  last_error           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (salon_id, vendor)
);

create table if not exists public.salon_vendor_invoices (
  id            uuid primary key default uuid_generate_v4(),
  salon_id      uuid not null references public.salons(id) on delete cascade,
  vendor        text not null check (vendor in ('amazon_business', 'meta', 'manual')),
  external_id   text,
  title         text not null,
  issued_at     date not null,
  period_key    text not null,
  amount_cents  int check (amount_cents is null or amount_cents >= 0),
  currency      text not null default 'EUR',
  storage_path  text not null,
  source        text not null default 'upload'
    check (source in ('upload', 'amazon_api', 'meta_api')),
  created_at    timestamptz not null default now(),
  unique (salon_id, vendor, external_id)
);

create index if not exists salon_vendor_invoices_period_idx
  on public.salon_vendor_invoices (salon_id, period_key, issued_at desc);

alter table public.salon_vendor_connections enable row level security;
alter table public.salon_vendor_invoices enable row level security;

drop policy if exists salon_vendor_connections_rw on public.salon_vendor_connections;
create policy salon_vendor_connections_rw on public.salon_vendor_connections
  for all
  using (salon_id = my_salon() and my_role() in ('admin', 'reception'))
  with check (salon_id = my_salon() and my_role() = 'admin');

drop policy if exists salon_vendor_invoices_rw on public.salon_vendor_invoices;
create policy salon_vendor_invoices_rw on public.salon_vendor_invoices
  for all
  using (salon_id = my_salon() and my_role() in ('admin', 'reception'))
  with check (salon_id = my_salon() and my_role() in ('admin', 'reception'));

grant select, insert, update, delete on public.salon_vendor_connections to authenticated;
grant select, insert, update, delete on public.salon_vendor_invoices to authenticated;

insert into storage.buckets (id, name, public)
values ('salon-vendor-invoices', 'salon-vendor-invoices', false)
on conflict (id) do nothing;

-- Path: {salon_id}/{vendor}/{period_key}/file.pdf
drop policy if exists salon_vendor_invoices_read on storage.objects;
create policy salon_vendor_invoices_read on storage.objects for select
  using (
    bucket_id = 'salon-vendor-invoices'
    and (storage.foldername(name))[1] = my_salon()::text
    and my_role() in ('admin', 'reception')
  );

drop policy if exists salon_vendor_invoices_insert on storage.objects;
create policy salon_vendor_invoices_insert on storage.objects for insert
  with check (
    bucket_id = 'salon-vendor-invoices'
    and (storage.foldername(name))[1] = my_salon()::text
    and my_role() in ('admin', 'reception')
  );

drop policy if exists salon_vendor_invoices_update on storage.objects;
create policy salon_vendor_invoices_update on storage.objects for update
  using (
    bucket_id = 'salon-vendor-invoices'
    and (storage.foldername(name))[1] = my_salon()::text
    and my_role() in ('admin', 'reception')
  )
  with check (
    bucket_id = 'salon-vendor-invoices'
    and (storage.foldername(name))[1] = my_salon()::text
    and my_role() in ('admin', 'reception')
  );

drop policy if exists salon_vendor_invoices_delete on storage.objects;
create policy salon_vendor_invoices_delete on storage.objects for delete
  using (
    bucket_id = 'salon-vendor-invoices'
    and (storage.foldername(name))[1] = my_salon()::text
    and my_role() in ('admin', 'reception')
  );
