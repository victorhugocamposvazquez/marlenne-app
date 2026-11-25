-- Anuncios, cuenta publicitaria y deshacer el último contacto.
-- La conexión (token) sigue sin políticas: solo el service role la lee.

alter table public.meta_connections
  add column if not exists ad_account_id text,
  add column if not exists ad_account_name text;

comment on column public.meta_connections.ad_account_id is
  'Cuenta publicitaria de Meta (act_…). Una por centro en esta versión.';

-- Páginas que devolvió el inicio de sesión, hasta que el admin elige una.
-- El token no sale de esta tabla: no hay políticas para authenticated.
create table if not exists public.meta_page_choices (
  salon_id           uuid not null references public.salons(id) on delete cascade,
  page_id            text not null,
  page_name          text,
  page_access_token  text not null,
  ad_account_id      text,
  ad_account_name    text,
  created_at         timestamptz not null default now(),
  primary key (salon_id, page_id)
);

alter table public.meta_page_choices enable row level security;

create table if not exists public.meta_ads (
  id              uuid primary key default uuid_generate_v4(),
  salon_id        uuid not null references public.salons(id) on delete cascade,
  campaign_id     text,
  campaign_name   text,
  ad_id           text,
  ad_name         text,
  thumbnail_url   text,
  headline        text,
  body            text,
  created_at      timestamptz not null default now()
);

create unique index if not exists meta_ads_ad_idx
  on public.meta_ads (salon_id, ad_id)
  where ad_id is not null;

alter table public.meta_ads enable row level security;

drop policy if exists meta_ads_desk on public.meta_ads;
create policy meta_ads_desk on public.meta_ads
  for select
  using (salon_id = my_salon() and my_role() in ('admin', 'reception'));

grant select on public.meta_ads to authenticated;

-- El centro puede ver qué página está conectada, nunca el token.
grant select (salon_id, page_id, page_name, ad_account_id, ad_account_name)
  on public.meta_connections to authenticated;

drop policy if exists meta_connections_read on public.meta_connections;
create policy meta_connections_read on public.meta_connections
  for select
  using (salon_id = my_salon() and my_role() in ('admin', 'reception'));

alter table public.lead_events drop constraint if exists lead_events_kind_check;
alter table public.lead_events add constraint lead_events_kind_check
  check (kind in ('call', 'whatsapp', 'note', 'tag', 'convert', 'undo'));
