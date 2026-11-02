-- Reserva online pública (tipo Calendly). Sin abrir tablas a anon:
-- RPCs SECURITY DEFINER con slug + booking_enabled.

alter table public.salons
  add column if not exists booking_slug text;

alter table public.salons
  add column if not exists booking_enabled boolean not null default false;

alter table public.salons
  add column if not exists booking_intro text;

comment on column public.salons.booking_slug is
  'Slug público /r/[slug] y /embed/[slug]. Único cuando no es null.';
comment on column public.salons.booking_enabled is
  'Si false, las RPCs de booking responden not_found.';
comment on column public.salons.booking_intro is
  'Texto corto bajo el nombre del centro en la página de reserva.';

create unique index if not exists salons_booking_slug_uidx
  on public.salons (booking_slug)
  where booking_slug is not null;

alter table public.services
  add column if not exists bookable_online boolean not null default true;

comment on column public.services.bookable_online is
  'Visible en el catálogo de reserva online del centro.';

-- Centros conocidos: un solo salón por slug, solo si el slug está libre.
update public.salons s
   set booking_slug = 'arlett',
       booking_enabled = true,
       booking_intro = coalesce(s.booking_intro, 'Elige servicio, día y hora. Te confirmamos al instante.')
 where s.id = (
   select id from public.salons
    where name ilike '%arlett%'
      and booking_slug is null
      and not exists (select 1 from public.salons x where x.booking_slug = 'arlett')
    order by created_at nulls last, id
    limit 1
 );

update public.salons s
   set booking_slug = 'marlenne',
       booking_enabled = true,
       booking_intro = coalesce(s.booking_intro, 'Elige servicio, día y hora. Te confirmamos al instante.')
 where s.id = (
   select id from public.salons
    where name = 'Marlenne'
      and booking_slug is null
      and not exists (select 1 from public.salons x where x.booking_slug = 'marlenne')
    order by created_at nulls last, id
    limit 1
 );

-- ── Helpers ──────────────────────────────────────────────────

create or replace function private.booking_salon_by_slug(p_slug text)
returns public.salons
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.salons;
  slug text := lower(trim(coalesce(p_slug, '')));
begin
  if slug = '' or slug !~ '^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$' then
    return null;
  end if;
  select * into s
    from public.salons
   where booking_slug = slug
     and booking_enabled
   limit 1;
  return s;
end;
$$;

revoke all on function private.booking_salon_by_slug(text) from public;

-- ── Catálogo público ─────────────────────────────────────────

create or replace function public.booking_catalog(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.salons;
begin
  s := private.booking_salon_by_slug(p_slug);
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'salon', jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'slug', s.booking_slug,
      'intro', s.booking_intro,
      'timezone', s.timezone,
      'opens_at', s.opens_at,
      'closes_at', s.closes_at,
      'phone', s.phone,
      'logo_path', s.logo_path
    ),
    'services', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', svc.id,
          'name', svc.name,
          'category', svc.category,
          'duration_min', svc.duration_min,
          'price_cents', svc.price_cents,
          'color', svc.color,
          'sort_order', svc.sort_order
        )
        order by svc.sort_order, svc.name
      )
      from public.services svc
      where svc.salon_id = s.id
        and svc.is_active
        and svc.bookable_online
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.booking_catalog(text) from public;
grant execute on function public.booking_catalog(text) to anon, authenticated, service_role;

-- ── Días con al menos un hueco (mes) ─────────────────────────

create or replace function public.booking_month_days(
  p_slug text,
  p_service_id uuid,
  p_year int,
  p_month int
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.salons;
  svc record;
  tz text;
  today_local date;
  month_start date;
  month_end date;
  d date;
  days jsonb := '[]'::jsonb;
  has_slot boolean;
  prov uuid;
begin
  s := private.booking_salon_by_slug(p_slug);
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
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

  if p_year < 2020 or p_year > 2100 or p_month < 1 or p_month > 12 then
    return jsonb_build_object('ok', false, 'code', 'range');
  end if;

  tz := coalesce(s.timezone, 'Europe/Madrid');
  today_local := (timezone(tz, now()))::date;
  month_start := make_date(p_year, p_month, 1);
  month_end := (month_start + interval '1 month' - interval '1 day')::date;

  d := greatest(month_start, today_local);
  while d <= month_end loop
    has_slot := false;
    for prov in
      select st.id
        from public.staff st
       where st.salon_id = s.id
         and st.is_active
         and st.role = 'provider'
    loop
      if exists (
        select 1
          from public.free_slots(prov, d, svc.duration_min, null, 15) fs
         where fs >= now()
         limit 1
      ) then
        has_slot := true;
        exit;
      end if;
    end loop;
    if has_slot then
      days := days || to_jsonb(to_char(d, 'YYYY-MM-DD'));
    end if;
    d := d + 1;
  end loop;

  return jsonb_build_object('ok', true, 'days', days);
end;
$$;

revoke all on function public.booking_month_days(text, uuid, int, int) from public;
grant execute on function public.booking_month_days(text, uuid, int, int) to anon, authenticated, service_role;

-- ── Huecos de un día (de-duplicados; provider opcional) ──────

create or replace function public.booking_day_slots(
  p_slug text,
  p_service_id uuid,
  p_date date,
  p_provider_id uuid default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.salons;
  svc record;
  tz text;
  today_local date;
  slots jsonb := '[]'::jsonb;
  seen text[] := '{}';
  prov uuid;
  slot timestamptz;
  key text;
begin
  s := private.booking_salon_by_slug(p_slug);
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
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

  tz := coalesce(s.timezone, 'Europe/Madrid');
  today_local := (timezone(tz, now()))::date;
  if p_date < today_local or p_date > today_local + 90 then
    return jsonb_build_object('ok', false, 'code', 'range');
  end if;

  for prov in
    select st.id
      from public.staff st
     where st.salon_id = s.id
       and st.is_active
       and st.role = 'provider'
       and (p_provider_id is null or st.id = p_provider_id)
     order by st.sort_order, st.full_name
  loop
    for slot in
      select fs from public.free_slots(prov, p_date, svc.duration_min, null, 15) as fs
    loop
      if slot < now() then
        continue;
      end if;
      key := to_char(timezone(tz, slot), 'HH24:MI');
      if key = any (seen) then
        continue;
      end if;
      seen := array_append(seen, key);
      slots := slots || jsonb_build_array(
        jsonb_build_object(
          'starts_at', slot,
          'provider_id', prov,
          'label', key
        )
      );
    end loop;
  end loop;

  -- Ordenar por hora
  select coalesce(jsonb_agg(x order by x->>'starts_at'), '[]'::jsonb)
    into slots
    from jsonb_array_elements(slots) as x;

  return jsonb_build_object('ok', true, 'slots', slots);
end;
$$;

revoke all on function public.booking_day_slots(text, uuid, date, uuid) from public;
grant execute on function public.booking_day_slots(text, uuid, date, uuid) to anon, authenticated, service_role;

-- ── Crear reserva ────────────────────────────────────────────

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

  -- Normalizar móvil ES a 34XXXXXXXXX (sin +)
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

  -- Resolver profesional/cabina
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

  -- Clienta: reutilizar por teléfono del centro
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
      starts_at, duration_min, price_cents, note, created_by
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
      null
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
    'client_name', name
  );
end;
$$;

revoke all on function public.booking_create(text, uuid, timestamptz, text, text, text, text, uuid) from public;
grant execute on function public.booking_create(text, uuid, timestamptz, text, text, text, text, uuid) to anon, authenticated, service_role;
