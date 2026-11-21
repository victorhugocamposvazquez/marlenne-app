-- 2 de 2. Cancelar deja de borrar la cita.
--
-- Qué hace:
--   a) columnas cancelled_at / cancelled_by / cancel_reason;
--   b) trigger: al cancelar, sella la hora y apaga el recordatorio; al reabrir, lo limpia;
--   c) rehace la restricción de solapes para que una cancelada no ocupe hueco;
--   d) vista appointments_live: todo menos las canceladas (es la que deben leer agenda, huecos, SMS y caja);
--   e) vista client_pack_balance: sesiones hechas, apartadas y disponibles de cada bono.
--
-- No borra ni modifica ninguna cita existente.

-- a) Columnas ---------------------------------------------------------------

alter table appointments
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references staff (id) on delete set null,
  add column if not exists cancel_reason text;

comment on column appointments.cancelled_at is 'Cuándo se canceló. Null si no está cancelada.';
comment on column appointments.cancelled_by is 'Quién la canceló. Null si canceló la clienta por la reserva online.';

-- b) Trigger ----------------------------------------------------------------

create or replace function appointments_on_cancel()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
    -- Una cancelada no recibe SMS aunque alguna consulta se olvide de filtrarla.
    new.reminder_due_at := null;
  elsif old.status = 'cancelled' and new.status is distinct from 'cancelled' then
    new.cancelled_at := null;
    new.cancelled_by := null;
    new.cancel_reason := null;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_on_cancel on appointments;
create trigger appointments_on_cancel
  before update of status on appointments
  for each row
  execute function appointments_on_cancel();

-- c) Solapes ----------------------------------------------------------------
--
-- La restricción actual ignora 'noshow'. Tiene que ignorar también 'cancelled';
-- si no, una cita cancelada seguiría bloqueando su hueco.
--
-- No se da por hecho ni el nombre ni la forma exacta: se lee la que hay, se conserva
-- tal cual (columnas, rango, operadores) y solo se sustituye el WHERE.
-- Si no hay exactamente una, o no tiene WHERE, la migración falla sin tocar nada.

do $$
declare
  con record;
  n int;
  new_def text;
begin
  select count(*) into n
  from pg_constraint
  where conrelid = 'public.appointments'::regclass and contype = 'x';

  if n <> 1 then
    raise exception 'Se esperaba 1 restricción de exclusión en appointments y hay %. Revisar a mano.', n;
  end if;

  select conname, pg_get_constraintdef(oid) as def into con
  from pg_constraint
  where conrelid = 'public.appointments'::regclass and contype = 'x';

  if con.def ilike '%cancelled%' then
    raise notice 'La restricción % ya ignora las canceladas. Nada que hacer.', con.conname;
    return;
  end if;

  if con.def !~* '\sWHERE\s*\(' then
    raise exception 'La restricción % no tiene WHERE: %', con.conname, con.def;
  end if;

  new_def := regexp_replace(
    con.def,
    '\sWHERE\s*\(.*\)\s*$',
    ' WHERE (status NOT IN (''noshow''::appointment_status, ''cancelled''::appointment_status))',
    'i'
  );

  raise notice 'Antes:   %', con.def;
  raise notice 'Después: %', new_def;

  execute format('alter table public.appointments drop constraint %I', con.conname);
  execute format('alter table public.appointments add constraint %I %s', con.conname, new_def);
end;
$$;

-- d) Citas vivas ------------------------------------------------------------
--
-- security_invoker: la vista aplica la RLS de quien consulta (salon_id = my_salon()),
-- no la de quien la creó.

create or replace view appointments_live
with (security_invoker = true)
as
select *
from appointments
where status <> 'cancelled';

comment on view appointments_live is
  'Citas sin las canceladas. Es la que leen la agenda, los huecos, los recordatorios, la caja y la reserva online. La tabla completa es para el historial.';

-- Historial de cancelaciones por clienta («¿cuántas veces ha cancelado?»).
create index if not exists appointments_cancelled_by_client
  on appointments (client_id, cancelled_at desc)
  where status = 'cancelled';

-- e) Saldo de bonos ---------------------------------------------------------
--
-- No hay columna de sesiones apartadas ni hace falta: una sesión está apartada mientras
-- exista una cita programada o en curso que apunte al bono. Al cancelar, se libera sola.

create or replace view client_pack_balance
with (security_invoker = true)
as
select
  p.id as client_pack_id,
  p.salon_id,
  p.owner_client_id,
  p.friend_client_id,
  p.name,
  p.service_id,
  p.sessions_total,
  p.sessions_done,
  coalesce(r.reserved, 0)::int as sessions_reserved,
  greatest(p.sessions_total - p.sessions_done - coalesce(r.reserved, 0), 0)::int as sessions_available,
  p.expires_at,
  (p.expires_at is not null and p.expires_at < current_date) as expired
from client_packs p
left join lateral (
  select count(*) as reserved
  from appointments a
  where a.client_pack_id = p.id
    and a.status in ('prog', 'curso')
) r on true;

comment on view client_pack_balance is
  'Saldo de cada bono: hechas, apartadas (citas programadas o en curso) y disponibles.';
