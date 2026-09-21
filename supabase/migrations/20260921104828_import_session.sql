-- Un lote = una pulsación de «Importar» (no por tipo ni por backfill).

alter type import_kind add value if not exists 'session';

alter table import_batches
  add column if not exists clients_created int not null default 0 check (clients_created >= 0),
  add column if not exists services_created int not null default 0 check (services_created >= 0),
  add column if not exists appointments_created int not null default 0 check (appointments_created >= 0);

-- Lotes inferidos (sin usuario) no son importaciones reales.
delete from import_batches where created_by is null;
