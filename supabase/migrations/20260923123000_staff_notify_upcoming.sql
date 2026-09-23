-- Cada miembro decide si quiere el aviso de citas próximas.
alter table staff
  add column if not exists notify_upcoming boolean not null default false;
