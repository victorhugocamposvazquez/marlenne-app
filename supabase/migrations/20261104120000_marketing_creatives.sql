-- Creatividades de marketing del centro (stories / posts exportados).

create table if not exists public.marketing_creatives (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  kind text not null,
  style_id text not null,
  format text not null,
  payload jsonb not null default '{}'::jsonb,
  image_path text,
  booking_link_id uuid,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_creatives_kind_chk
    check (kind in ('bono', 'servicio', 'reserva', 'hueco', 'equipo', 'regalo')),
  constraint marketing_creatives_format_chk
    check (format in ('story_9_16', 'post_1_1', 'post_4_5'))
);

create index if not exists marketing_creatives_salon_created_idx
  on public.marketing_creatives (salon_id, created_at desc);

comment on table public.marketing_creatives is
  'Creatividades generadas en Ajustes → Marketing (PNG + metadatos).';
comment on column public.marketing_creatives.style_id is
  'Id de plantilla visual en código (lib/marketing/styles.ts).';
comment on column public.marketing_creatives.image_path is
  'Ruta en bucket marketing-creatives: {salon_id}/{id}.png';
comment on column public.marketing_creatives.payload is
  'Textos finales + refs (service_id, pack_template_id, staff_id, cta_url, etc.).';

alter table public.marketing_creatives enable row level security;

drop policy if exists marketing_creatives_read on public.marketing_creatives;
create policy marketing_creatives_read on public.marketing_creatives for select
  using (salon_id = my_salon());

drop policy if exists marketing_creatives_write on public.marketing_creatives;
create policy marketing_creatives_write on public.marketing_creatives for all
  using (salon_id = my_salon() and my_role() = 'admin')
  with check (salon_id = my_salon() and my_role() = 'admin');

grant select, insert, update, delete on public.marketing_creatives to authenticated;

insert into storage.buckets (id, name, public)
values ('marketing-creatives', 'marketing-creatives', true)
on conflict (id) do nothing;

drop policy if exists marketing_creatives_storage_read on storage.objects;
create policy marketing_creatives_storage_read on storage.objects for select
  using (bucket_id = 'marketing-creatives');

drop policy if exists marketing_creatives_storage_insert on storage.objects;
create policy marketing_creatives_storage_insert on storage.objects for insert
  with check (
    bucket_id = 'marketing-creatives'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  );

drop policy if exists marketing_creatives_storage_update on storage.objects;
create policy marketing_creatives_storage_update on storage.objects for update
  using (
    bucket_id = 'marketing-creatives'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  )
  with check (
    bucket_id = 'marketing-creatives'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  );

drop policy if exists marketing_creatives_storage_delete on storage.objects;
create policy marketing_creatives_storage_delete on storage.objects for delete
  using (
    bucket_id = 'marketing-creatives'
    and my_role() = 'admin'
    and (storage.foldername(name))[1] = my_salon()::text
  );
