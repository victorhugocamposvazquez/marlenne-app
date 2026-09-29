-- Corrige agenda_busy_day_keys (no existe status 'cancel'; las canceladas se borran).

create or replace function public.agenda_busy_day_keys(
  p_from timestamptz,
  p_to timestamptz,
  p_provider_ids uuid[]
)
returns setof text
language sql
stable
security invoker
set search_path = public
as $$
  select distinct to_char((starts_at at time zone 'Europe/Madrid')::date, 'YYYY-MM-DD')
  from appointments
  where provider_id = any(p_provider_ids)
    and starts_at >= p_from
    and starts_at <= p_to;
$$;

grant execute on function public.agenda_busy_day_keys(timestamptz, timestamptz, uuid[]) to authenticated;
