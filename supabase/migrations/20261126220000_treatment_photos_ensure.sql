-- Fotos antes/después en la ficha de clienta (bucket treatment-photos).
-- Idempotente: seguro si el init ya creó tabla y políticas.

create table if not exists public.treatment_photos (
  id             uuid primary key default uuid_generate_v4(),
  treatment_id   uuid not null references public.treatments(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  session_no     int,
  zone           text,
  kind           text not null check (kind in ('before', 'after')),
  storage_path   text not null,
  taken_at       timestamptz not null default now(),
  taken_by       uuid references public.staff(id)
);

create index if not exists treatment_photos_treatment_session_idx
  on public.treatment_photos (treatment_id, session_no);

alter table public.treatment_photos enable row level security;

-- Si ya corrió 20261126140000_client_photos.sql, no pisar RLS ni Storage (fotos client/…).
do $policy$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'treatment_photos' and column_name = 'client_id'
  ) then
    return;
  end if;

  drop policy if exists photos_all on public.treatment_photos;
  create policy photos_all on public.treatment_photos for all
    using (
      exists (
        select 1 from public.treatments t
        where t.id = treatment_id and t.salon_id = my_salon()
      )
    )
    with check (
      exists (
        select 1 from public.treatments t
        where t.id = treatment_id and t.salon_id = my_salon()
      )
    );
end;
$policy$;

grant select, insert, update, delete on public.treatment_photos to authenticated;

insert into storage.buckets (id, name, public)
values ('treatment-photos', 'treatment-photos', false)
on conflict (id) do nothing;

do $storage$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'treatment_photos' and column_name = 'client_id'
  ) then
    return;
  end if;

  drop policy if exists treatment_photos_read on storage.objects;
  create policy treatment_photos_read on storage.objects for select
    using (
      bucket_id = 'treatment-photos'
      and exists (
        select 1 from public.treatments t
        where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
      )
    );

  drop policy if exists treatment_photos_insert on storage.objects;
  create policy treatment_photos_insert on storage.objects for insert
    with check (
      bucket_id = 'treatment-photos'
      and exists (
        select 1 from public.treatments t
        where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
      )
    );

  drop policy if exists treatment_photos_update on storage.objects;
  create policy treatment_photos_update on storage.objects for update
    using (
      bucket_id = 'treatment-photos'
      and exists (
        select 1 from public.treatments t
        where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
      )
    );

  drop policy if exists treatment_photos_delete on storage.objects;
  create policy treatment_photos_delete on storage.objects for delete
    using (
      bucket_id = 'treatment-photos'
      and exists (
        select 1 from public.treatments t
        where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
      )
    );
end;
$storage$;