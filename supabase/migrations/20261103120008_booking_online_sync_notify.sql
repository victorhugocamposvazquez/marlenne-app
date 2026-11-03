-- Origen online + avisos email del centro; booking_create marca source=online.

alter table public.appointments
  add column if not exists source text not null default 'agenda';

alter table public.appointments
  drop constraint if exists appointments_source_check;

alter table public.appointments
  add constraint appointments_source_check
  check (source in ('agenda', 'online', 'import'));

comment on column public.appointments.source is
  'agenda | online | import — origen del alta.';

alter table public.salons
  add column if not exists booking_notify_email text;

alter table public.salons
  add column if not exists booking_sms_reminders boolean not null default true;

comment on column public.salons.booking_notify_email is
  'Email del centro para avisos de reserva online. Null = no envía.';
comment on column public.salons.booking_sms_reminders is
  'Si false, no se encola recordatorio SMS en reservas online.';

create or replace function public.booking_create(
  p_slug text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_note text default null,
  p_provider_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.salons;
  svc record;
  name text := trim(coalesce(p_full_name, ''));
  phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^\d+]', '', 'g'), '');
  email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  note text := nullif(trim(coalesce(p_note, '')), '');
  client_id uuid;
  prov uuid;
  new_end timestamptz;
  new_id uuid;
  try_prov uuid;
begin
  s := private.booking_salon_by_slug(p_slug);
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if length(name) < 2 then
    return jsonb_build_object('ok', false, 'code', 'name');
  end if;

  if phone is not null then
    if left(phone, 1) = '+' then phone := substr(phone, 2); end if;
    if phone ~ '^00' then phone := substr(phone, 3); end if;
    if phone ~ '^[67][0-9]{8}$' then phone := '34' || phone; end if;
  end if;
  if phone is null or phone !~ '^34[67][0-9]{8}$' then
    return jsonb_build_object('ok', false, 'code', 'phone');
  end if;

  if p_starts_at is null or p_starts_at < now() - interval '1 minute' then
    return jsonb_build_object('ok', false, 'code', 'past');
  end if;
  if p_starts_at > now() + interval '90 days' then
    return jsonb_build_object('ok', false, 'code', 'range');
  end if;

  select * into svc
    from public.services
   where id = p_service_id
     and salon_id = s.id
     and is_active
     and bookable_online;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'service');
  end if;

  new_end := p_starts_at + (svc.duration_min || ' minutes')::interval;

  if p_provider_id is not null then
    if not exists (
      select 1 from public.staff st
       where st.id = p_provider_id
         and st.salon_id = s.id
         and st.is_active
         and st.role = 'provider'
    ) then
      return jsonb_build_object('ok', false, 'code', 'provider');
    end if;
    if exists (
      select 1 from public.time_blocks b
       where b.provider_id = p_provider_id
         and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, new_end)
    ) or exists (
      select 1 from public.appointments a
       where a.provider_id = p_provider_id
         and a.status <> 'noshow'
         and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, new_end)
    ) then
      return jsonb_build_object('ok', false, 'code', 'overlap');
    end if;
    prov := p_provider_id;
  else
    prov := null;
    for try_prov in
      select st.id
        from public.staff st
       where st.salon_id = s.id
         and st.is_active
         and st.role = 'provider'
       order by st.sort_order, st.full_name
    loop
      if not exists (
        select 1 from public.time_blocks b
         where b.provider_id = try_prov
           and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, new_end)
      ) and not exists (
        select 1 from public.appointments a
         where a.provider_id = try_prov
           and a.status <> 'noshow'
           and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, new_end)
      ) then
        prov := try_prov;
        exit;
      end if;
    end loop;
    if prov is null then
      return jsonb_build_object('ok', false, 'code', 'overlap');
    end if;
  end if;

  select c.id into client_id
    from public.clients c
   where c.salon_id = s.id
     and c.phone = phone
   order by c.created_at desc
   limit 1;

  if client_id is null then
    insert into public.clients (salon_id, full_name, phone, email)
    values (s.id, name, phone, email)
    returning id into client_id;
  else
    update public.clients c
       set full_name = name,
           email = coalesce(email, c.email)
     where c.id = client_id;
  end if;

  begin
    insert into public.appointments (
      salon_id, client_id, client_name, service_id, provider_id,
      starts_at, duration_min, price_cents, note, created_by, source
    ) values (
      s.id,
      client_id,
      null,
      svc.id,
      prov,
      p_starts_at,
      svc.duration_min,
      svc.price_cents,
      case
        when note is null then 'Reserva online'
        else 'Reserva online · ' || note
      end,
      null,
      'online'
    )
    returning id into new_id;
  exception
    when exclusion_violation then
      return jsonb_build_object('ok', false, 'code', 'overlap');
  end;

  return jsonb_build_object(
    'ok', true,
    'id', new_id,
    'starts_at', p_starts_at,
    'duration_min', svc.duration_min,
    'service_name', svc.name,
    'salon_name', s.name,
    'salon_id', s.id,
    'client_name', name,
    'client_email', email,
    'client_phone', phone,
    'timezone', s.timezone,
    'notify_email', s.booking_notify_email,
    'sms_reminders', coalesce(s.booking_sms_reminders, true)
  );
end;
$$;

revoke all on function public.booking_create(text, uuid, timestamptz, text, text, text, text, uuid) from public;
grant execute on function public.booking_create(text, uuid, timestamptz, text, text, text, text, uuid) to anon, authenticated, service_role;
