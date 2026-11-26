-- Papelera de leads: borrado suave y borrado definitivo.

alter table public.leads
  add column if not exists deleted_at timestamptz;

comment on column public.leads.deleted_at is
  'Si no es null, el lead está en la papelera y no sale en la bandeja activa.';

create index if not exists leads_salon_active_created_idx
  on public.leads (salon_id, created_at desc)
  where deleted_at is null;

create index if not exists leads_salon_trash_idx
  on public.leads (salon_id, deleted_at desc)
  where deleted_at is not null;

create or replace function public.lead_group_names(p_salon_id uuid, p_kind text)
returns table (name text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct trim(
    case when p_kind = 'ad' then l.ad_name else l.campaign_name end
  ) as name
  from public.leads l
  where l.salon_id = p_salon_id
    and l.deleted_at is null
    and trim(coalesce(case when p_kind = 'ad' then l.ad_name else l.campaign_name end, '')) <> ''
  order by 1;
$$;

create or replace function public.lead_distinct_tags(p_salon_id uuid)
returns table (tag text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct trim(t) as tag
  from public.leads l
  cross join lateral unnest(l.tags) as t
  where l.salon_id = p_salon_id
    and l.deleted_at is null
    and trim(t) <> ''
  order by 1;
$$;