-- Slugs amigables para servicios y cabinas en URLs de reserva (/r/salon/cavitacion).

alter table public.services
  add column if not exists booking_slug text;

alter table public.staff
  add column if not exists booking_slug text;

comment on column public.services.booking_slug is
  'Slug público en /r/{salon}/{service}. Único por centro cuando no es null.';
comment on column public.staff.booking_slug is
  'Slug público de cabina/profesional en ?con=… Único por centro cuando no es null.';

create unique index if not exists services_salon_booking_slug_uidx
  on public.services (salon_id, booking_slug)
  where booking_slug is not null;

create unique index if not exists staff_salon_booking_slug_uidx
  on public.staff (salon_id, booking_slug)
  where booking_slug is not null;

create or replace function private.booking_slugify(p_text text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  s := lower(trim(coalesce(p_text, '')));
  s := translate(s,
    'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuunc');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  s := left(s, 48);
  if s = '' then
    return 'item';
  end if;
  return s;
end;
$$;

revoke all on function private.booking_slugify(text) from public;

-- Rellenar servicios sin slug (colisiones → sufijo de id).
do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in
    select id, salon_id, name
      from public.services
     where booking_slug is null
     order by sort_order, name, id
  loop
    base := private.booking_slugify(r.name);
    candidate := base;
    n := 2;
    while exists (
      select 1 from public.services s
       where s.salon_id = r.salon_id
         and s.booking_slug = candidate
         and s.id <> r.id
    ) loop
      candidate := left(base, 40) || '-' || n::text;
      n := n + 1;
    end loop;
    update public.services set booking_slug = candidate where id = r.id;
  end loop;
end $$;

-- Rellenar cabinas/profesionales sin slug.
do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in
    select id, salon_id, full_name
      from public.staff
     where role = 'provider'
       and booking_slug is null
     order by sort_order, full_name, id
  loop
    base := private.booking_slugify(r.full_name);
    candidate := base;
    n := 2;
    while exists (
      select 1 from public.staff s
       where s.salon_id = r.salon_id
         and s.booking_slug = candidate
         and s.id <> r.id
    ) loop
      candidate := left(base, 40) || '-' || n::text;
      n := n + 1;
    end loop;
    update public.staff set booking_slug = candidate where id = r.id;
  end loop;
end $$;

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
          'slug', coalesce(svc.booking_slug, private.booking_slugify(svc.name)),
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
          'slug', coalesce(st.booking_slug, private.booking_slugify(st.full_name)),
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
