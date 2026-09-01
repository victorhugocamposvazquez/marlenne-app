-- Packs / bonos (saldo comercial, distinto de treatments.sessions_total).
-- Pack amigo: friend_client_id comparte el mismo saldo.
-- Al marcar Hecha se consume una sesión (no al reservar).

create table pack_templates (
  id              uuid primary key default uuid_generate_v4(),
  salon_id        uuid not null references salons(id) on delete cascade,
  name            text not null,
  service_id      uuid references services(id) on delete set null,
  sessions_total  int not null check (sessions_total >= 1),
  price_cents     int not null default 0 check (price_cents >= 0),
  valid_days      int check (valid_days is null or valid_days > 0),
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);
create index on pack_templates (salon_id, is_active, sort_order);

create table client_packs (
  id                uuid primary key default uuid_generate_v4(),
  salon_id          uuid not null references salons(id) on delete cascade,
  template_id       uuid references pack_templates(id) on delete set null,
  name              text not null,
  service_id        uuid references services(id) on delete set null,
  owner_client_id   uuid not null references clients(id) on delete cascade,
  friend_client_id  uuid references clients(id) on delete set null,
  sessions_total    int not null check (sessions_total >= 1),
  sessions_done     int not null default 0 check (sessions_done >= 0),
  price_cents       int not null default 0 check (price_cents >= 0),
  purchased_at      date not null default current_date,
  expires_at        date,
  note              text,
  created_by        uuid references staff(id),
  created_at        timestamptz not null default now(),
  check (friend_client_id is null or friend_client_id <> owner_client_id)
);
create index on client_packs (salon_id, owner_client_id);
create index on client_packs (salon_id, friend_client_id);
create index on client_packs (service_id);

alter table appointments
  add column client_pack_id uuid references client_packs(id) on delete set null;
create index on appointments (client_pack_id);

alter table pack_templates enable row level security;
alter table client_packs   enable row level security;

create policy pack_templates_read on pack_templates for select
  using (salon_id = my_salon());
create policy pack_templates_write on pack_templates for all
  using (salon_id = my_salon() and my_role() = 'admin')
  with check (salon_id = my_salon() and my_role() = 'admin');

create policy client_packs_read on client_packs for select
  using (salon_id = my_salon());
create policy client_packs_write on client_packs for all
  using (salon_id = my_salon() and my_role() in ('admin', 'reception'))
  with check (salon_id = my_salon() and my_role() in ('admin', 'reception'));

-- Sesiones reservadas (prog/curso) no se han consumido aún.
create or replace function private.pack_remaining(p_pack uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0,
    cp.sessions_total - cp.sessions_done - (
      select count(*)::int from appointments a
      where a.client_pack_id = cp.id and a.status in ('prog', 'curso')
    )
  )
  from client_packs cp
  where cp.id = p_pack;
$$;

revoke all on function private.pack_remaining(uuid) from public;
grant execute on function private.pack_remaining(uuid) to authenticated;

create or replace function on_appointment_done() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  svc   services;
  t     treatments;
begin
  if new.status <> 'done' or old.status = 'done' then return new; end if;

  if new.client_pack_id is not null then
    update client_packs
       set sessions_done = least(sessions_total, sessions_done + 1)
     where id = new.client_pack_id
       and salon_id = new.salon_id;
  end if;

  if new.client_id is null then return new; end if;

  select * into svc from services where id = new.service_id;
  if svc.category = 'valoracion' then return new; end if;

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

  if t.sessions_done >= t.sessions_total then
    update treatments set closed_at = current_date where id = t.id;
  end if;

  return new;
end $$;

drop function if exists public.create_appointment(uuid, text, uuid, uuid, timestamptz, text);
drop function if exists private.create_appointment(uuid, text, uuid, uuid, timestamptz, text);

create or replace function private.create_appointment(
  p_client_id uuid,
  p_client_name text,
  p_service_id uuid,
  p_provider_id uuid,
  p_starts_at timestamptz,
  p_note text,
  p_client_pack_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who staff_role;
  salon uuid;
  svc record;
  pack record;
  new_end timestamptz;
  new_id uuid;
  pack_price int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  salon := my_salon();
  who := my_role();
  if salon is null or who is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if who = 'provider' and p_provider_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if who not in ('admin', 'reception', 'provider') then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if p_client_id is null and (p_client_name is null or length(trim(p_client_name)) < 2) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if p_client_id is not null and not exists (
    select 1 from clients c where c.id = p_client_id and c.salon_id = salon
  ) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  select s.duration_min, s.price_cents, s.salon_id, s.is_active
    into svc
    from services s
   where s.id = p_service_id;

  if not found or svc.salon_id is distinct from salon or not svc.is_active then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if not exists (
    select 1 from staff st
    where st.id = p_provider_id and st.salon_id = salon and st.is_active
  ) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  pack_price := svc.price_cents;

  if p_client_pack_id is not null then
    if p_client_id is null then
      return jsonb_build_object('ok', false, 'code', 'pack');
    end if;

    select cp.id, cp.salon_id, cp.service_id, cp.owner_client_id, cp.friend_client_id, cp.expires_at
      into pack
      from client_packs cp
     where cp.id = p_client_pack_id;

    if not found or pack.salon_id is distinct from salon then
      return jsonb_build_object('ok', false, 'code', 'pack');
    end if;

    if pack.owner_client_id is distinct from p_client_id
       and pack.friend_client_id is distinct from p_client_id then
      return jsonb_build_object('ok', false, 'code', 'pack');
    end if;

    if pack.service_id is not null and pack.service_id is distinct from p_service_id then
      return jsonb_build_object('ok', false, 'code', 'pack');
    end if;

    if pack.expires_at is not null and pack.expires_at < current_date then
      return jsonb_build_object('ok', false, 'code', 'pack');
    end if;

    if private.pack_remaining(p_client_pack_id) <= 0 then
      return jsonb_build_object('ok', false, 'code', 'pack');
    end if;

    pack_price := 0;
  end if;

  new_end := p_starts_at + (svc.duration_min || ' minutes')::interval;

  if exists (
    select 1 from time_blocks b
    where b.provider_id = p_provider_id
      and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, new_end)
  ) then
    return jsonb_build_object('ok', false, 'code', 'blocked');
  end if;

  if exists (
    select 1 from appointments a
    where a.provider_id = p_provider_id
      and a.status <> 'noshow'
      and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, new_end)
  ) then
    return jsonb_build_object('ok', false, 'code', 'overlap');
  end if;

  insert into appointments (
    salon_id, client_id, client_name, service_id, provider_id,
    starts_at, duration_min, price_cents, note, created_by, client_pack_id
  ) values (
    salon,
    p_client_id,
    case when p_client_id is null then trim(p_client_name) else null end,
    p_service_id,
    p_provider_id,
    p_starts_at,
    svc.duration_min,
    pack_price,
    nullif(trim(p_note), ''),
    auth.uid(),
    p_client_pack_id
  )
  returning id into new_id;

  return jsonb_build_object('ok', true, 'id', new_id);
exception
  when exclusion_violation then
    return jsonb_build_object('ok', false, 'code', 'overlap');
  when others then
    if sqlerrm ilike '%bloqueada%' then
      return jsonb_build_object('ok', false, 'code', 'blocked');
    end if;
    raise;
end;
$$;

revoke all on function private.create_appointment(uuid, text, uuid, uuid, timestamptz, text, uuid) from public;
grant execute on function private.create_appointment(uuid, text, uuid, uuid, timestamptz, text, uuid) to authenticated;

create or replace function public.create_appointment(
  p_client_id uuid,
  p_client_name text,
  p_service_id uuid,
  p_provider_id uuid,
  p_starts_at timestamptz,
  p_note text,
  p_client_pack_id uuid default null
) returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.create_appointment(
    p_client_id, p_client_name, p_service_id, p_provider_id, p_starts_at, p_note, p_client_pack_id
  );
$$;

revoke all on function public.create_appointment(uuid, text, uuid, uuid, timestamptz, text, uuid) from public;
grant execute on function public.create_appointment(uuid, text, uuid, uuid, timestamptz, text, uuid) to authenticated;
