-- ============================================================
-- Marlenne — esquema Supabase (Postgres)
-- Ejecutar en el SQL editor de Supabase, en este orden.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;   -- para el índice de exclusión de solapes

-- ─────────────── Enums ───────────────

create type service_category as enum (
  'corporal', 'facial', 'laser', 'micro', 'bienestar', 'valoracion'
);

create type appointment_status as enum (
  'prog',    -- agendada
  'curso',   -- en cabina
  'done',    -- hecha
  'noshow'   -- no vino
);

create type staff_role as enum ('admin', 'reception', 'provider');

create type block_reason as enum ('comida', 'descanso', 'cabina', 'personal', 'vacaciones');

-- ─────────────── Centro / equipo ───────────────

create table salons (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  timezone      text not null default 'Europe/Madrid',
  opens_at      time not null default '09:00',
  closes_at     time not null default '20:00',
  created_at    timestamptz not null default now()
);

-- Un perfil por usuario de Supabase Auth.
create table staff (
  id            uuid primary key references auth.users(id) on delete cascade,
  salon_id      uuid not null references salons(id) on delete cascade,
  full_name     text not null,
  initials      text generated always as (
                  upper(left(split_part(full_name,' ',1),1) ||
                        coalesce(left(split_part(full_name,' ',2),1),''))
                ) stored,
  role          staff_role not null,
  job_title     text,                       -- "Técnico láser · aparatología"
  color         text,                       -- hex del avatar/columna
  is_active     boolean not null default true,
  sort_order    int not null default 0,     -- orden de columnas en la agenda
  works_from    time,                       -- jornada propia; null = la del centro
  works_to      time,
  created_at    timestamptz not null default now()
);
create index on staff (salon_id, is_active, sort_order);

-- ─────────────── Catálogo ───────────────

create table services (
  id              uuid primary key default uuid_generate_v4(),
  salon_id        uuid not null references salons(id) on delete cascade,
  name            text not null,
  category        service_category not null,
  duration_min    int not null check (duration_min > 0),
  price_cents     int not null default 0 check (price_cents >= 0),
  -- nº de sesiones sugerido al abrir un tratamiento de este servicio
  default_sessions int not null default 1,
  -- claves de parámetros técnicos que se piden al cerrar cada sesión
  param_keys      text[] not null default '{}',
  is_active       boolean not null default true,
  sort_order      int not null default 0
);
create index on services (salon_id, category, is_active, sort_order);

-- ─────────────── Clientas ───────────────

create table clients (
  id            uuid primary key default uuid_generate_v4(),
  salon_id      uuid not null references salons(id) on delete cascade,
  full_name     text not null,
  phone         text,                       -- E.164 para el SMS: +34612480331
  email         text,
  birth_date    date,
  -- etiquetas manuales: 'VIP', 'Piel sensible', 'Fototipo IV'…
  tags          text[] not null default '{}',
  notes         text,                       -- notas internas (dato sensible)
  sms_opt_in    boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on clients (salon_id);
create index on clients using gin (to_tsvector('spanish', full_name));
create index on clients (salon_id, phone);

-- ─────────────── Tratamientos (entidad central de la ficha) ───────────────

create table treatments (
  id              uuid primary key default uuid_generate_v4(),
  salon_id        uuid not null references salons(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  service_id      uuid not null references services(id),
  provider_id     uuid references staff(id),  -- quien lo lleva habitualmente
  zone            text,                       -- "Abdomen + flancos"
  sessions_done   int not null default 0,
  sessions_total  int not null default 1,
  -- parámetros de la última sesión: {"FLUENCIA":"14 J/cm²","PULSO":"30 ms"}
  last_params     jsonb not null default '{}',
  note            text,
  opened_at       date not null default current_date,
  closed_at       date,
  created_at      timestamptz not null default now()
);
create index on treatments (client_id, closed_at);
create index on treatments (salon_id, service_id);

-- ─────────────── Citas ───────────────

create table appointments (
  id            uuid primary key default uuid_generate_v4(),
  salon_id      uuid not null references salons(id) on delete cascade,
  client_id     uuid references clients(id) on delete set null,
  -- nombre libre para clientas que aún no están en la base
  client_name   text,
  service_id    uuid not null references services(id),
  provider_id   uuid not null references staff(id),
  treatment_id  uuid references treatments(id) on delete set null,
  session_no    int,
  starts_at     timestamptz not null,
  duration_min  int not null check (duration_min > 0),
  ends_at       timestamptz generated always as
                  (starts_at + (duration_min || ' minutes')::interval) stored,
  status        appointment_status not null default 'prog',
  price_cents   int,                          -- congela el precio del catálogo
  note          text,
  created_by    uuid references staff(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (client_id is not null or client_name is not null)
);
create index on appointments (salon_id, starts_at);
create index on appointments (provider_id, starts_at);
create index on appointments (client_id, starts_at desc);
create index on appointments (treatment_id);

-- ─────────────── Bloqueos de horario ───────────────

create table time_blocks (
  id            uuid primary key default uuid_generate_v4(),
  salon_id      uuid not null references salons(id) on delete cascade,
  provider_id   uuid not null references staff(id) on delete cascade,
  reason        block_reason not null,
  label         text,
  starts_at     timestamptz not null,
  duration_min  int not null check (duration_min > 0),
  ends_at       timestamptz generated always as
                  (starts_at + (duration_min || ' minutes')::interval) stored,
  created_at    timestamptz not null default now()
);
create index on time_blocks (provider_id, starts_at);

-- ── Sin solapes por profesional (citas activas y bloqueos) ──
-- Las canceladas se borran, así que basta excluir noshow del bloqueo.
alter table appointments add constraint appointments_no_overlap
  exclude using gist (
    provider_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'noshow');

alter table time_blocks add constraint time_blocks_no_overlap
  exclude using gist (
    provider_id with =,
    tstzrange(starts_at, ends_at) with &&
  );

-- Cita contra bloqueo: no se puede con EXCLUDE entre tablas → trigger.
create or replace function check_block_conflict() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from time_blocks b
    where b.provider_id = new.provider_id
      and tstzrange(b.starts_at, b.ends_at) &&
          tstzrange(new.starts_at, new.starts_at + (new.duration_min || ' minutes')::interval)
  ) then
    raise exception 'La franja está bloqueada para esa profesional';
  end if;
  return new;
end $$;

create trigger appointments_block_conflict
  before insert or update of starts_at, duration_min, provider_id on appointments
  for each row when (new.status <> 'noshow')
  execute function check_block_conflict();

-- ─────────────── Medidas por tratamiento ───────────────

-- Una fila por métrica y sesión: permite series temporales y métricas nuevas
-- sin migrar nada (criolipólisis → cm; láser → % densidad; HIFU → grados).
create table measurements (
  id            uuid primary key default uuid_generate_v4(),
  treatment_id  uuid not null references treatments(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  session_no    int,
  metric        text not null,              -- 'CINTURA', 'DENSIDAD'
  value_num     numeric,                    -- para graficar
  value_text    text,                       -- 'Media-alta', 'Fino'
  unit          text,                       -- 'cm', 'mm', '%', '°', 'kg'
  is_baseline   boolean not null default false,
  measured_at   timestamptz not null default now(),
  measured_by   uuid references staff(id)
);
create index on measurements (treatment_id, metric, measured_at);

-- ─────────────── Fotos antes/después ───────────────

create table treatment_photos (
  id            uuid primary key default uuid_generate_v4(),
  treatment_id  uuid not null references treatments(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  session_no    int,
  zone          text,
  kind          text not null check (kind in ('before','after')),
  storage_path  text not null,              -- bucket privado treatment-photos
  taken_at      timestamptz not null default now(),
  taken_by      uuid references staff(id)
);
create index on treatment_photos (treatment_id, session_no);

-- ─────────────── Lista de espera ───────────────

create table waitlist (
  id            uuid primary key default uuid_generate_v4(),
  salon_id      uuid not null references salons(id) on delete cascade,
  client_id     uuid references clients(id) on delete cascade,
  client_name   text,
  service_id    uuid references services(id),
  preference    text,                        -- 'tardes, esta semana'
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index on waitlist (salon_id, resolved_at);

-- ─────────────── Consentimientos (RGPD art. 9) ───────────────

create table consents (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid not null references clients(id) on delete cascade,
  service_id    uuid references services(id),
  kind          text not null,               -- 'tratamiento', 'fotografia', 'datos_salud'
  signed_at     timestamptz not null default now(),
  expires_at    date,
  document_path text,
  taken_by      uuid references staff(id)
);
create index on consents (client_id, kind);

-- ─────────────── Log de SMS ───────────────

create table sms_log (
  id             uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  to_phone       text not null,
  body           text not null,
  provider_id    text,                       -- id del envío en Twilio
  status         text not null default 'queued',
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  unique (appointment_id, to_phone)          -- evita duplicados del cron
);

-- ============================================================
-- Row Level Security
-- ============================================================

create or replace function my_salon() returns uuid
language sql stable security definer set search_path = public as $$
  select salon_id from staff where id = auth.uid()
$$;

create or replace function my_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from staff where id = auth.uid()
$$;

alter table salons            enable row level security;
alter table staff             enable row level security;
alter table services          enable row level security;
alter table clients           enable row level security;
alter table treatments        enable row level security;
alter table appointments      enable row level security;
alter table time_blocks       enable row level security;
alter table measurements      enable row level security;
alter table treatment_photos  enable row level security;
alter table waitlist          enable row level security;
alter table consents          enable row level security;
alter table sms_log           enable row level security;

-- Lectura general dentro del propio centro
create policy salon_read on salons for select
  using (id = my_salon());

create policy staff_read on staff for select
  using (salon_id = my_salon());

create policy services_read on services for select
  using (salon_id = my_salon());
create policy services_write on services for all
  using (salon_id = my_salon() and my_role() = 'admin')
  with check (salon_id = my_salon() and my_role() = 'admin');

-- Clientas: solo admin y recepción. Las profesionales NO acceden a la base
-- de clientas (coincide con la UI: no tienen pestaña Clientas)…
create policy clients_read on clients for select
  using (salon_id = my_salon() and my_role() in ('admin','reception'));
create policy clients_write on clients for all
  using (salon_id = my_salon() and my_role() in ('admin','reception'))
  with check (salon_id = my_salon() and my_role() in ('admin','reception'));

-- …pero sí ven la ficha clínica de las clientas que atienden.
create policy treatments_read on treatments for select
  using (
    salon_id = my_salon() and (
      my_role() in ('admin','reception')
      or exists (
        select 1 from appointments a
        where a.treatment_id = treatments.id and a.provider_id = auth.uid()
      )
      or provider_id = auth.uid()
    )
  );
create policy treatments_write on treatments for all
  using (salon_id = my_salon())
  with check (salon_id = my_salon());

-- Agenda: todo el centro la lee (para ver huecos y reprogramar).
create policy appointments_read on appointments for select
  using (salon_id = my_salon());
-- Admin y recepción escriben cualquier cita; las profesionales solo las suyas.
create policy appointments_write on appointments for all
  using (
    salon_id = my_salon() and
    (my_role() in ('admin','reception') or provider_id = auth.uid())
  )
  with check (
    salon_id = my_salon() and
    (my_role() in ('admin','reception') or provider_id = auth.uid())
  );

create policy blocks_read on time_blocks for select
  using (salon_id = my_salon());
create policy blocks_write on time_blocks for all
  using (
    salon_id = my_salon() and
    (my_role() in ('admin','reception') or provider_id = auth.uid())
  )
  with check (
    salon_id = my_salon() and
    (my_role() in ('admin','reception') or provider_id = auth.uid())
  );

-- Medidas y fotos siguen el acceso del tratamiento.
create policy measurements_all on measurements for all
  using (exists (select 1 from treatments t where t.id = treatment_id and t.salon_id = my_salon()))
  with check (exists (select 1 from treatments t where t.id = treatment_id and t.salon_id = my_salon()));

create policy photos_all on treatment_photos for all
  using (exists (select 1 from treatments t where t.id = treatment_id and t.salon_id = my_salon()))
  with check (exists (select 1 from treatments t where t.id = treatment_id and t.salon_id = my_salon()));

create policy waitlist_all on waitlist for all
  using (salon_id = my_salon() and my_role() in ('admin','reception'))
  with check (salon_id = my_salon() and my_role() in ('admin','reception'));

create policy consents_all on consents for all
  using (exists (select 1 from clients c where c.id = client_id and c.salon_id = my_salon()))
  with check (exists (select 1 from clients c where c.id = client_id and c.salon_id = my_salon()));

create policy sms_read on sms_log for select
  using (exists (
    select 1 from appointments a where a.id = appointment_id and a.salon_id = my_salon()
  ));

-- ─────────────── Storage ───────────────
-- Bucket privado: las fotos de tratamiento son datos de salud (RGPD art. 9).
-- Se sirven siempre con signed URLs generadas en el servidor.

insert into storage.buckets (id, name, public)
values ('treatment-photos', 'treatment-photos', false)
on conflict (id) do nothing;

-- Solo el equipo del centro dueño del tratamiento toca los objetos. La primera
-- carpeta de la ruta es el treatment_id: treatment-photos/<treatment_id>/...
create policy treatment_photos_read on storage.objects for select
  using (
    bucket_id = 'treatment-photos'
    and exists (
      select 1 from treatments t
      where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
    )
  );

-- Upsert necesita insert + select + update; el select ya está arriba.
create policy treatment_photos_insert on storage.objects for insert
  with check (
    bucket_id = 'treatment-photos'
    and exists (
      select 1 from treatments t
      where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
    )
  );

create policy treatment_photos_update on storage.objects for update
  using (
    bucket_id = 'treatment-photos'
    and exists (
      select 1 from treatments t
      where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
    )
  );

create policy treatment_photos_delete on storage.objects for delete
  using (
    bucket_id = 'treatment-photos'
    and exists (
      select 1 from treatments t
      where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
    )
  );

-- ============================================================
-- Abrir/avanzar tratamiento al marcar una cita como 'done'
-- (equivalente al comportamiento del prototipo)
-- ============================================================

create or replace function on_appointment_done() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  svc   services;
  t     treatments;
begin
  if new.status <> 'done' or old.status = 'done' then return new; end if;
  if new.client_id is null then return new; end if;

  select * into svc from services where id = new.service_id;
  if svc.category = 'valoracion' then return new; end if;   -- no abre tratamiento

  -- ¿tratamiento abierto de este servicio?
  select * into t from treatments
   where client_id = new.client_id and service_id = new.service_id and closed_at is null
   order by opened_at desc limit 1;

  if t.id is null then
    insert into treatments (salon_id, client_id, service_id, provider_id,
                            sessions_done, sessions_total,
                            last_params)
    values (new.salon_id, new.client_id, new.service_id, new.provider_id,
            1, greatest(svc.default_sessions, 1),
            (select coalesce(jsonb_object_agg(k, ''), '{}') from unnest(svc.param_keys) k))
    returning * into t;
  else
    update treatments
       set sessions_done = least(sessions_total, sessions_done + 1)
     where id = t.id
    returning * into t;
  end if;

  update appointments
     set treatment_id = t.id, session_no = t.sessions_done
   where id = new.id;

  -- cerrar el tratamiento al completar las sesiones
  if t.sessions_done >= t.sessions_total then
    update treatments set closed_at = current_date where id = t.id;
  end if;

  return new;
end $$;

create trigger appointments_done_opens_treatment
  after update of status on appointments
  for each row execute function on_appointment_done();

-- El centro y su catálogo de servicios van en la migración siguiente.

-- ============================================================
-- Huecos libres de un profesional en un día (para el flujo de nueva cita)
-- ============================================================

create or replace function free_slots(
  p_provider uuid,
  p_date     date,
  p_duration int,
  p_exclude  uuid default null,
  p_step     int default 30
) returns setof timestamptz
language plpgsql stable as $$
declare
  s   record;
  tz  text;
  cur timestamptz;
  fin timestamptz;
begin
  select coalesce(st.works_from, sa.opens_at)  as opens,
         coalesce(st.works_to,   sa.closes_at) as closes,
         sa.timezone
    into s
    from staff st join salons sa on sa.id = st.salon_id
   where st.id = p_provider;

  tz  := s.timezone;
  cur := (p_date + s.opens)  at time zone tz;
  fin := (p_date + s.closes) at time zone tz;

  while cur + (p_duration || ' minutes')::interval <= fin loop
    if not exists (
      select 1 from appointments a
       where a.provider_id = p_provider and a.status <> 'noshow'
         and (p_exclude is null or a.id <> p_exclude)
         and tstzrange(a.starts_at, a.ends_at) &&
             tstzrange(cur, cur + (p_duration || ' minutes')::interval)
    ) and not exists (
      select 1 from time_blocks b
       where b.provider_id = p_provider
         and tstzrange(b.starts_at, b.ends_at) &&
             tstzrange(cur, cur + (p_duration || ' minutes')::interval)
    ) then
      return next cur;
    end if;
    cur := cur + (p_step || ' minutes')::interval;
  end loop;
end $$;
