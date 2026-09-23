-- Aviso al equipo (PWA) 30 minutos antes de cada cita.
-- La suscripción la escribe el servidor. El cliente no toca estas filas.

-- La base ya tiene la función de 7 argumentos (con bono). La de 6, si sigue,
-- hace que Postgres no sepa cuál usar.
drop function if exists public.create_appointment(uuid, text, uuid, uuid, timestamptz, text);
drop function if exists private.create_appointment(uuid, text, uuid, uuid, timestamptz, text);

alter table appointments
  add column if not exists staff_reminded_at timestamptz;

create index if not exists appointments_staff_reminder_due
  on appointments (starts_at)
  where status = 'prog' and staff_reminded_at is null;

create table if not exists staff_push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  staff_id    uuid not null references staff(id) on delete cascade,
  salon_id    uuid not null references salons(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists staff_push_subscriptions_salon_idx
  on staff_push_subscriptions (salon_id);

alter table staff_push_subscriptions enable row level security;

revoke all on table staff_push_subscriptions from anon, authenticated, public;
grant all on table staff_push_subscriptions to service_role;

-- Si la cita se mueve, el aviso de los 30 minutos vuelve a estar pendiente.
create or replace function clear_staff_reminder_on_move()
returns trigger
language plpgsql
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.staff_reminded_at := null;
  end if;
  return new;
end $$;

drop trigger if exists appointments_clear_staff_reminder on appointments;
create trigger appointments_clear_staff_reminder
  before update of starts_at on appointments
  for each row execute function clear_staff_reminder_on_move();
