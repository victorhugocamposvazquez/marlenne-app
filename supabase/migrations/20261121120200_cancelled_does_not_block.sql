-- 3 de 3. Una cancelada no ocupa hueco.
--
-- La restricción de exclusión ya la ignora. Estas funciones repetían
-- «status <> noshow» y seguirían viendo la fila como ocupada.

do $$
declare
  r record;
  src text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) like '%status <> ''noshow''%'
  loop
    src := replace(
      pg_get_functiondef(r.oid),
      'status <> ''noshow''',
      'status not in (''noshow'', ''cancelled'')'
    );
    execute src;
  end loop;
end;
$$;

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
    and starts_at <= p_to
    and status <> 'cancelled';
$$;

grant execute on function public.agenda_busy_day_keys(timestamptz, timestamptz, uuid[]) to authenticated;

grant select on public.appointments_live to authenticated, service_role;
grant select on public.client_pack_balance to authenticated, service_role;
