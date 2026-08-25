-- Crear cita desde el cliente (Capacitor / PWA) con código de error tipado.
-- Cuerpo en `private` (SECURITY DEFINER); PostgREST solo ve el wrapper invoker.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.create_appointment(
  p_client_id uuid,
  p_client_name text,
  p_service_id uuid,
  p_provider_id uuid,
  p_starts_at timestamptz,
  p_note text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who staff_role;
  salon uuid;
  svc record;
  new_end timestamptz;
  new_id uuid;
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
    starts_at, duration_min, price_cents, note, created_by
  ) values (
    salon,
    p_client_id,
    case when p_client_id is null then trim(p_client_name) else null end,
    p_service_id,
    p_provider_id,
    p_starts_at,
    svc.duration_min,
    svc.price_cents,
    nullif(trim(p_note), ''),
    auth.uid()
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

revoke all on function private.create_appointment(uuid, text, uuid, uuid, timestamptz, text) from public;
grant execute on function private.create_appointment(uuid, text, uuid, uuid, timestamptz, text) to authenticated;

create or replace function public.create_appointment(
  p_client_id uuid,
  p_client_name text,
  p_service_id uuid,
  p_provider_id uuid,
  p_starts_at timestamptz,
  p_note text
) returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.create_appointment(
    p_client_id, p_client_name, p_service_id, p_provider_id, p_starts_at, p_note
  );
$$;

revoke all on function public.create_appointment(uuid, text, uuid, uuid, timestamptz, text) from public;
grant execute on function public.create_appointment(uuid, text, uuid, uuid, timestamptz, text) to authenticated;

grant execute on function public.free_slots(uuid, date, int, uuid, int) to authenticated;
