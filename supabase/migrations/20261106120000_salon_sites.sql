-- Web pública del centro (Marketing → Tu página web).

create table if not exists public.salon_sites (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  slug text not null,
  custom_domain text,
  published_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_sites_salon_unique unique (salon_id),
  constraint salon_sites_slug_format check (
    slug ~ '^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$'
  )
);

create unique index if not exists salon_sites_slug_uidx
  on public.salon_sites (slug);

create unique index if not exists salon_sites_custom_domain_uidx
  on public.salon_sites (custom_domain)
  where custom_domain is not null;

comment on table public.salon_sites is
  'Configuración y publicación de la web del centro (look, textos, extras, fotos).';
comment on column public.salon_sites.slug is
  'Subdominio /s/{slug} y futuro {slug}.marlenapp.com';
comment on column public.salon_sites.config is
  'JSON del editor WebStudio (plantilla, textos, extras, media, flags de servicios).';
comment on column public.salon_sites.published_at is
  'Null = borrador; con valor = visible en público.';

alter table public.salon_sites enable row level security;

drop policy if exists salon_sites_staff_read on public.salon_sites;
create policy salon_sites_staff_read on public.salon_sites for select
  using (salon_id = my_salon());

drop policy if exists salon_sites_staff_write on public.salon_sites;
create policy salon_sites_staff_write on public.salon_sites for all
  using (salon_id = my_salon() and my_role() = 'admin')
  with check (salon_id = my_salon() and my_role() = 'admin');

-- Lectura anónima solo de sitios publicados (ruta /s/[slug]).
drop policy if exists salon_sites_public_read on public.salon_sites;
create policy salon_sites_public_read on public.salon_sites for select
  using (published_at is not null);

grant select, insert, update, delete on public.salon_sites to authenticated;
grant select on public.salon_sites to anon;

insert into storage.buckets (id, name, public)
values ('salon-sites', 'salon-sites', true)
on conflict (id) do nothing;

drop policy if exists salon_sites_storage_read on storage.objects;
create policy salon_sites_storage_read on storage.objects for select
  using (bucket_id = 'salon-sites');

drop policy if exists salon_sites_storage_insert on storage.objects;
create policy salon_sites_storage_insert on storage.objects for insert
  with check (
    bucket_id = 'salon-sites'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  );

drop policy if exists salon_sites_storage_update on storage.objects;
create policy salon_sites_storage_update on storage.objects for update
  using (
    bucket_id = 'salon-sites'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  )
  with check (
    bucket_id = 'salon-sites'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  );

drop policy if exists salon_sites_storage_delete on storage.objects;
create policy salon_sites_storage_delete on storage.objects for delete
  using (
    bucket_id = 'salon-sites'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  );
