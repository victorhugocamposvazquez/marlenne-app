-- Mover cita (arrastre / ficha) en un solo roundtrip, atómico, con código
-- de error tipado. El cuerpo va en `private` (SECURITY DEFINER); PostgREST
-- solo ve el wrapper invoker en public.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.move_appointment(
  p_id uuid,
  p_starts_at timestamptz,
  p_provider_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r appointments%rowtype;
  who staff_role;
  new_end timestamptz;
begin
  if auth.uid() is null then
    return 'forbidden';
  end if;

  select * into r from appointments where id = p_id;
  if not found then
    return 'not_found';
  end if;

  if r.salon_id is distinct from my_salon() then
    return 'forbidden';
  end if;

  who := my_role();
  if who is null then
    return 'forbidden';
  end if;

  -- Misma regla que RLS: profesional solo sus citas y su columna.
  if who = 'provider' and (r.provider_id is distinct from auth.uid()
      or p_provider_id is distinct from auth.uid()) then
    return 'forbidden';
  end if;

  if who not in ('admin', 'reception', 'provider') then
    return 'forbidden';
  end if;

  if not exists (
    select 1 from staff s
    where s.id = p_provider_id and s.salon_id = r.salon_id and s.is_active
  ) then
    return 'forbidden';
  end if;

  new_end := p_starts_at + (r.duration_min || ' minutes')::interval;

  if exists (
    select 1 from time_blocks b
    where b.provider_id = p_provider_id
      and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, new_end)
  ) then
    return 'blocked';
  end if;

  if exists (
    select 1 from appointments a
    where a.id <> p_id
      and a.provider_id = p_provider_id
      and a.status <> 'noshow'
      and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, new_end)
  ) then
    return 'overlap';
  end if;

  update appointments
     set starts_at = p_starts_at,
         provider_id = p_provider_id,
         updated_at = now()
   where id = p_id;

  return 'ok';
exception
  when exclusion_violation then
    return 'overlap';
end;
$$;

revoke all on function private.move_appointment(uuid, timestamptz, uuid) from public;
grant execute on function private.move_appointment(uuid, timestamptz, uuid) to authenticated;

create or replace function public.move_appointment(
  p_id uuid,
  p_starts_at timestamptz,
  p_provider_id uuid
) returns text
language sql
security invoker
set search_path = public, private
as $$
  select private.move_appointment(p_id, p_starts_at, p_provider_id);
$$;

revoke all on function public.move_appointment(uuid, timestamptz, uuid) from public;
grant execute on function public.move_appointment(uuid, timestamptz, uuid) to authenticated;
