-- Trazabilidad de importaciones CSV/Excel para poder deshacer por lote.

create type import_kind as enum ('clients', 'services', 'appointments');

create table import_batches (
  id           uuid primary key default uuid_generate_v4(),
  salon_id     uuid not null references salons(id) on delete cascade,
  kind         import_kind not null,
  created_at   timestamptz not null default now(),
  created_by   uuid references staff(id) on delete set null,
  file_name    text,
  rows_created int not null default 0 check (rows_created >= 0)
);
create index on import_batches (salon_id, created_at desc);
create index on import_batches (salon_id, kind, created_at desc);

alter table clients
  add column import_batch_id uuid references import_batches(id) on delete set null;
create index on clients (import_batch_id) where import_batch_id is not null;

alter table services
  add column import_batch_id uuid references import_batches(id) on delete set null;
create index on services (import_batch_id) where import_batch_id is not null;

alter table appointments
  add column import_batch_id uuid references import_batches(id) on delete set null;
create index on appointments (import_batch_id) where import_batch_id is not null;

alter table import_batches enable row level security;

create policy import_batches_read on import_batches for select
  using (salon_id = my_salon() and my_role() = 'admin');

create policy import_batches_write on import_batches for all
  using (salon_id = my_salon() and my_role() = 'admin')
  with check (salon_id = my_salon() and my_role() = 'admin');
