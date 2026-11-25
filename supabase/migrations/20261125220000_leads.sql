-- Leads de anuncios Meta. OPS enciende la función por centro.
-- El centro no puede activársela solo: un trigger ignora el cambio si no viene del service role.

alter table public.salons
  add column if not exists feature_leads boolean not null default false;

comment on column public.salons.feature_leads is
  'Si true, el centro tiene la bandeja de leads. Lo activa OPS (service role), no el centro.';

create or replace function public.protect_feature_leads()
returns trigger
language plpgsql
as $$
begin
  -- service_role (panel y webhook) y el rol de mantenimiento pueden cambiarlo.
  -- La sesión del centro (authenticated) no.
  if new.feature_leads is distinct from old.feature_leads
     and coalesce(auth.role(), '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    new.feature_leads := old.feature_leads;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_feature_leads on public.salons;
create trigger protect_feature_leads
  before update on public.salons
  for each row
  execute function public.protect_feature_leads();

-- Token de la página de Facebook. Sin políticas: solo el service role (webhook y OPS).
create table if not exists public.meta_connections (
  salon_id           uuid primary key references public.salons(id) on delete cascade,
  page_id            text not null,
  page_name          text,
  page_access_token  text not null,
  created_at         timestamptz not null default now()
);

create unique index if not exists meta_connections_page_idx
  on public.meta_connections (page_id);

alter table public.meta_connections enable row level security;

create table if not exists public.leads (
  id              uuid primary key default uuid_generate_v4(),
  salon_id        uuid not null references public.salons(id) on delete cascade,
  full_name       text not null,
  phone           text,
  email           text,
  meta_lead_id    text,
  campaign_id     text,
  campaign_name   text,
  ad_id           text,
  ad_name         text,
  thumbnail_url   text,
  ad_headline     text,
  ad_body         text,
  tags            text[] not null default '{}',
  last_channel    text check (last_channel is null or last_channel in ('call', 'whatsapp')),
  client_id       uuid references public.clients(id) on delete set null,
  created_at      timestamptz not null default now()
);

create unique index if not exists leads_meta_idx
  on public.leads (salon_id, meta_lead_id)
  where meta_lead_id is not null;

create index if not exists leads_salon_created_idx
  on public.leads (salon_id, created_at desc);

create table if not exists public.lead_events (
  id          uuid primary key default uuid_generate_v4(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  staff_id    uuid references public.staff(id) on delete set null,
  kind        text not null check (kind in ('call', 'whatsapp', 'note', 'tag', 'convert')),
  body        text,
  created_at  timestamptz not null default now()
);

create index if not exists lead_events_lead_idx
  on public.lead_events (lead_id, created_at desc);

create table if not exists public.lead_wa_templates (
  id           uuid primary key default uuid_generate_v4(),
  salon_id     uuid not null references public.salons(id) on delete cascade,
  scope        text not null check (scope in ('salon', 'campaign', 'ad')),
  campaign_id  text,
  ad_id        text,
  body         text not null,
  created_at   timestamptz not null default now()
);

create unique index if not exists lead_wa_salon_idx
  on public.lead_wa_templates (salon_id)
  where scope = 'salon';

create unique index if not exists lead_wa_campaign_idx
  on public.lead_wa_templates (salon_id, campaign_id)
  where scope = 'campaign' and campaign_id is not null;

create unique index if not exists lead_wa_ad_idx
  on public.lead_wa_templates (salon_id, ad_id)
  where scope = 'ad' and ad_id is not null;

alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.lead_wa_templates enable row level security;

drop policy if exists leads_desk on public.leads;
create policy leads_desk on public.leads
  for all
  using (salon_id = my_salon() and my_role() in ('admin', 'reception'))
  with check (salon_id = my_salon() and my_role() in ('admin', 'reception'));

drop policy if exists lead_events_desk on public.lead_events;
create policy lead_events_desk on public.lead_events
  for all
  using (salon_id = my_salon() and my_role() in ('admin', 'reception'))
  with check (salon_id = my_salon() and my_role() in ('admin', 'reception'));

drop policy if exists lead_wa_templates_desk on public.lead_wa_templates;
create policy lead_wa_templates_desk on public.lead_wa_templates
  for all
  using (salon_id = my_salon() and my_role() in ('admin', 'reception'))
  with check (salon_id = my_salon() and my_role() in ('admin', 'reception'));

grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.lead_events to authenticated;
grant select, insert, update, delete on public.lead_wa_templates to authenticated;
