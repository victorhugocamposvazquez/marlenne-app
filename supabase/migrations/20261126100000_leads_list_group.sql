-- Cómo agrupa la bandeja de leads: por campaña o por anuncio.

alter table public.salons
  add column if not exists leads_list_group text not null default 'campaign'
  check (leads_list_group in ('campaign', 'ad'));

comment on column public.salons.leads_list_group is
  'Bandeja de leads: chips y línea secundaria por campaign o ad. Lo cambia el admin en Ajustes.';