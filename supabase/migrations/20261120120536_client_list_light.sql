-- Lista de clientas: próxima cita, última visita y conteo en una sola consulta.
-- Buscador: «contiene» usa trigramas, así ILIKE '%mar%' no recorre la tabla.

create extension if not exists pg_trgm;

do $$
begin
  begin
    create index if not exists clients_name_fold_trgm
      on public.clients using gin (name_fold gin_trgm_ops);
  exception
    when undefined_object then
      create index if not exists clients_name_fold_trgm
        on public.clients using gin (name_fold extensions.gin_trgm_ops);
  end;

  begin
    create index if not exists clients_phone_trgm
      on public.clients using gin (phone gin_trgm_ops);
  exception
    when undefined_object then
      create index if not exists clients_phone_trgm
        on public.clients using gin (phone extensions.gin_trgm_ops);
  end;
end $$;

create or replace function public.client_list_stats(p_ids uuid[], p_since timestamptz)
returns table (
  client_id uuid,
  next_at timestamptz,
  last_at timestamptz,
  visit_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with ids as (
    select id
    from unnest(p_ids[1:80]) as id
  ),
  upcoming as (
    select distinct on (a.client_id)
      a.client_id,
      a.starts_at as next_at
    from public.appointments a
    join ids on ids.id = a.client_id
    where a.status in ('prog', 'curso')
      and a.starts_at >= now()
    order by a.client_id, a.starts_at
  ),
  past as (
    select
      a.client_id,
      max(a.starts_at) as last_at,
      count(*)::integer as visit_count
    from public.appointments a
    join ids on ids.id = a.client_id
    where a.status = 'done'
      and a.starts_at >= p_since
      and a.starts_at < now()
    group by a.client_id
  )
  select
    ids.id,
    upcoming.next_at,
    past.last_at,
    coalesce(past.visit_count, 0)
  from ids
  left join upcoming on upcoming.client_id = ids.id
  left join past on past.client_id = ids.id;
$$;

revoke all on function public.client_list_stats(uuid[], timestamptz) from public;
grant execute on function public.client_list_stats(uuid[], timestamptz) to authenticated;

comment on function public.client_list_stats(uuid[], timestamptz) is
  'Para una página de clientas: próxima cita, última visita y visitas hechas desde p_since. Máximo 80 ids.';
