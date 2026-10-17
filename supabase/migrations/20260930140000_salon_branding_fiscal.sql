-- Nombre comercial ya está en salons.name.
-- Datos de facturación + logo del centro.

alter table public.salons
  add column if not exists legal_name text;

alter table public.salons
  add column if not exists tax_id text;

alter table public.salons
  add column if not exists fiscal_address text;

alter table public.salons
  add column if not exists phone text;

alter table public.salons
  add column if not exists logo_path text;

comment on column public.salons.legal_name is
  'Titular o razón social que aparece como emisor en facturas.';
comment on column public.salons.tax_id is
  'NIF / CIF del emisor.';
comment on column public.salons.fiscal_address is
  'Dirección fiscal del emisor.';
comment on column public.salons.phone is
  'Teléfono del centro (facturas y contacto).';
comment on column public.salons.logo_path is
  'Ruta en bucket salon-branding: {salon_id}/logo.jpg';

-- Logo público (no es dato de salud): sirve en preview de factura y PDFs.
insert into storage.buckets (id, name, public)
values ('salon-branding', 'salon-branding', true)
on conflict (id) do nothing;

-- Primera carpeta de la ruta = salon_id.
drop policy if exists salon_branding_read on storage.objects;
create policy salon_branding_read on storage.objects for select
  using (bucket_id = 'salon-branding');

drop policy if exists salon_branding_insert on storage.objects;
create policy salon_branding_insert on storage.objects for insert
  with check (
    bucket_id = 'salon-branding'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  );

drop policy if exists salon_branding_update on storage.objects;
create policy salon_branding_update on storage.objects for update
  using (
    bucket_id = 'salon-branding'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  )
  with check (
    bucket_id = 'salon-branding'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  );

drop policy if exists salon_branding_delete on storage.objects;
create policy salon_branding_delete on storage.objects for delete
  using (
    bucket_id = 'salon-branding'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  );
