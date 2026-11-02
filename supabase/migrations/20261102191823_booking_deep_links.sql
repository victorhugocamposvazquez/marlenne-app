-- Deep links / widgets con servicio (y opcionalmente cabina) preseleccionados.
-- booking_catalog expone providers; booking_month_days filtra por provider.

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
    ), '[]'::jsonb),
    'providers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', st.id,
          'name', st.full_name,
          'sort_order', st.sort_order
        )
        order by st.sort_order, st.full_name
      )
      from public.staff st
      where st.salon_id = s.id
        and st.is_active
        and st.role = 'provider'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.booking_catalog(text) from public;
grant execute on function public.booking_catalog(text) to anon, authenticated, service_role;

-- Sustituye la firma antigua (sin provider) por una con provider opcional.
drop function if exists public.booking_month_days(text, uuid, int, int);

create or replace function public.booking_month_days(
  p_slug text,
  p_service_id uuid,
  p_year int,
  p_month int,
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

  if p_provider_id is not null and not exists (
    select 1 from public.staff st
     where st.id = p_provider_id
       and st.salon_id = s.id
       and st.is_active
       and st.role = 'provider'
  ) then
    return jsonb_build_object('ok', false, 'code', 'provider');
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
         and (p_provider_id is null or st.id = p_provider_id)
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

revoke all on function public.booking_month_days(text, uuid, int, int, uuid) from public;
grant execute on function public.booking_month_days(text, uuid, int, int, uuid) to anon, authenticated, service_role;
