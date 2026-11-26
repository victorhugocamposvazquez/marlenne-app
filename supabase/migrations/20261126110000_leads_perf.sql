-- Rendimiento bandeja de leads: índice y RPC ligeras.

create index if not exists leads_salon_created_at_idx
  on public.leads (salon_id, created_at desc);

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
    and trim(t) <> ''
  order by 1;
$$;