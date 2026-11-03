-- Tema visual del widget de reservas (accent del salón).

alter table public.salons
  add column if not exists booking_accent text;

alter table public.salons
  add column if not exists booking_accent_soft text;

alter table public.salons
  add column if not exists booking_ink text;

comment on column public.salons.booking_accent is
  'Hex #RRGGBB del color principal del widget de reserva. Null = default.';
comment on column public.salons.booking_accent_soft is
  'Hex suave derivado o manual. Null = se deriva del accent en cliente.';
comment on column public.salons.booking_ink is
  'Hex del texto fuerte del widget. Null = se deriva en cliente.';

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
      'logo_path', s.logo_path,
      'accent', s.booking_accent,
      'accent_soft', s.booking_accent_soft,
      'ink', s.booking_ink
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
