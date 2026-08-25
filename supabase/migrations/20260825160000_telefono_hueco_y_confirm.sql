-- Bucle del teléfono: primer hueco en N días, enlace sí/no sin cuenta.
-- Cuerpo en `private` (SECURITY DEFINER). PostgREST solo ve wrappers.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
grant usage on schema private to anon;

alter table appointments
  add column if not exists confirmed_at timestamptz;

create table if not exists appointment_links (
  id              uuid primary key default uuid_generate_v4(),
  salon_id        uuid not null references salons(id) on delete cascade,
  appointment_id  uuid references appointments(id) on delete set null,
  token_hash      text not null unique,
  first_name      text not null,
  service_name    text not null,
  starts_at       timestamptz not null,
  expires_at      timestamptz not null,
  responded_at    timestamptz,
  response        text,
  created_at      timestamptz not null default now(),
  constraint appointment_links_response_chk
    check (response is null or response in ('yes', 'no'))
);

create index if not exists appointment_links_appt_idx on appointment_links (appointment_id);

alter table appointment_links enable row level security;

create or replace function private.token_hash(p_token text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

revoke all on function private.token_hash(text) from public;

create or replace function private.next_free_slot(
  p_duration int,
  p_provider uuid,
  p_exclude uuid,
  p_days int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  salon uuid;
  who staff_role;
  d int;
  the_date date;
  tz text;
  today_local date;
  slot timestamptz;
  best_at timestamptz;
  best_prov uuid;
  prov uuid;
  span int;
  only_prov uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  salon := my_salon();
  who := my_role();
  if salon is null or who is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_duration is null or p_duration < 15 then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  only_prov := p_provider;
  if who = 'provider' then
    only_prov := auth.uid();
  end if;

  select sa.timezone into tz from salons sa where sa.id = salon;
  tz := coalesce(tz, 'Europe/Madrid');
  today_local := (timezone(tz, now()))::date;
  span := least(greatest(coalesce(p_days, 7), 1), 14);

  for d in 0 .. span - 1 loop
    the_date := today_local + d;
    best_at := null;
    best_prov := null;
    for prov in
      select st.id
        from staff st
       where st.salon_id = salon
         and st.is_active
         and st.role = 'provider'
         and (only_prov is null or st.id = only_prov)
    loop
      for slot in
        select fs from free_slots(prov, the_date, p_duration, p_exclude, 15) as fs
      loop
        if slot >= now() and (best_at is null or slot < best_at) then
          best_at := slot;
          best_prov := prov;
        end if;
      end loop;
    end loop;
    if best_at is not null then
      return jsonb_build_object(
        'ok', true,
        'provider_id', best_prov,
        'starts_at', best_at
      );
    end if;
  end loop;

  return jsonb_build_object('ok', false, 'code', 'none');
end;
$$;

revoke all on function private.next_free_slot(int, uuid, uuid, int) from public;
grant execute on function private.next_free_slot(int, uuid, uuid, int) to authenticated;

create or replace function public.next_free_slot(
  p_duration int,
  p_provider uuid default null,
  p_exclude uuid default null,
  p_days int default 7
) returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.next_free_slot(p_duration, p_provider, p_exclude, p_days);
$$;

revoke all on function public.next_free_slot(int, uuid, uuid, int) from public;
grant execute on function public.next_free_slot(int, uuid, uuid, int) to authenticated;

create or replace function private.issue_appointment_link(p_appointment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  salon uuid;
  who staff_role;
  a record;
  raw text;
  hash text;
  expires timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  salon := my_salon();
  who := my_role();
  if salon is null or who is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  select
      ap.id,
      ap.salon_id,
      ap.status,
      ap.starts_at,
      ap.provider_id,
      split_part(trim(coalesce(c.full_name, ap.client_name, 'Hola')), ' ', 1) as first_name,
      coalesce(s.name, 'tu cita') as service_name
    into a
    from appointments ap
    left join clients c on c.id = ap.client_id
    left join services s on s.id = ap.service_id
   where ap.id = p_appointment_id;

  if not found or a.salon_id is distinct from salon then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if who = 'provider' and a.provider_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if a.status <> 'prog' then
    return jsonb_build_object('ok', false, 'code', 'gone');
  end if;

  raw := replace(replace(rtrim(encode(gen_random_bytes(24), 'base64'), '='), '+', '-'), '/', '_');
  hash := private.token_hash(raw);
  expires := least(a.starts_at + interval '2 hours', now() + interval '7 days');

  delete from appointment_links
   where appointment_id = a.id and responded_at is null;

  insert into appointment_links (
    salon_id, appointment_id, token_hash, first_name, service_name, starts_at, expires_at
  ) values (
    salon, a.id, hash, a.first_name, a.service_name, a.starts_at, expires
  );

  return jsonb_build_object('ok', true, 'token', raw);
end;
$$;

revoke all on function private.issue_appointment_link(uuid) from public;
grant execute on function private.issue_appointment_link(uuid) to authenticated;

create or replace function public.issue_appointment_link(p_appointment_id uuid)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.issue_appointment_link(p_appointment_id);
$$;

revoke all on function public.issue_appointment_link(uuid) from public;
grant execute on function public.issue_appointment_link(uuid) to authenticated;

create or replace function private.peek_appointment_link(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lnk appointment_links;
  st appointment_status;
begin
  if p_token is null or length(p_token) < 16 then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select * into lnk
    from appointment_links
   where token_hash = private.token_hash(p_token);

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if lnk.responded_at is not null then
    return jsonb_build_object(
      'ok', true,
      'responded', true,
      'response', lnk.response,
      'first_name', lnk.first_name,
      'service', lnk.service_name,
      'starts_at', lnk.starts_at
    );
  end if;

  if lnk.expires_at < now() then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  if lnk.appointment_id is null then
    return jsonb_build_object('ok', false, 'code', 'gone');
  end if;

  select status into st from appointments where id = lnk.appointment_id;
  if not found or st <> 'prog' then
    return jsonb_build_object('ok', false, 'code', 'gone');
  end if;

  return jsonb_build_object(
    'ok', true,
    'responded', false,
    'first_name', lnk.first_name,
    'service', lnk.service_name,
    'starts_at', lnk.starts_at
  );
end;
$$;

revoke all on function private.peek_appointment_link(text) from public;
grant execute on function private.peek_appointment_link(text) to anon, authenticated;

create or replace function public.peek_appointment_link(p_token text)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.peek_appointment_link(p_token);
$$;

revoke all on function public.peek_appointment_link(text) from public;
grant execute on function public.peek_appointment_link(text) to anon, authenticated;

create or replace function private.respond_appointment_link(p_token text, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lnk appointment_links;
  st appointment_status;
begin
  if p_action not in ('yes', 'no') then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_token is null or length(p_token) < 16 then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select * into lnk
    from appointment_links
   where token_hash = private.token_hash(p_token)
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if lnk.responded_at is not null then
    return jsonb_build_object(
      'ok', true,
      'responded', true,
      'response', lnk.response,
      'first_name', lnk.first_name,
      'service', lnk.service_name,
      'starts_at', lnk.starts_at
    );
  end if;

  if lnk.expires_at < now() then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  if lnk.appointment_id is null then
    return jsonb_build_object('ok', false, 'code', 'gone');
  end if;

  select status into st from appointments where id = lnk.appointment_id;
  if not found or st <> 'prog' then
    return jsonb_build_object('ok', false, 'code', 'gone');
  end if;

  update appointment_links
     set responded_at = now(), response = p_action
   where id = lnk.id;

  if p_action = 'yes' then
    update appointments set confirmed_at = now() where id = lnk.appointment_id;
  else
    delete from appointments where id = lnk.appointment_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'responded', true,
    'response', p_action,
    'first_name', lnk.first_name,
    'service', lnk.service_name,
    'starts_at', lnk.starts_at
  );
end;
$$;

revoke all on function private.respond_appointment_link(text, text) from public;
grant execute on function private.respond_appointment_link(text, text) to anon, authenticated;

create or replace function public.respond_appointment_link(p_token text, p_action text)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.respond_appointment_link(p_token, p_action);
$$;

revoke all on function public.respond_appointment_link(text, text) from public;
grant execute on function public.respond_appointment_link(text, text) to anon, authenticated;
