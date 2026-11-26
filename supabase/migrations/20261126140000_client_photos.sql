-- Fotos de la clienta sin tratamiento y sin cita marcada como hecha.
-- La ruta en Storage es client/<client_id>/...; las de tratamiento siguen en <treatment_id>/...

alter table treatment_photos
  add column if not exists client_id uuid references clients(id) on delete cascade;

alter table treatment_photos
  alter column treatment_id drop not null;

alter table treatment_photos
  drop constraint if exists treatment_photos_has_owner;

alter table treatment_photos
  add constraint treatment_photos_has_owner
  check (treatment_id is not null or client_id is not null);

create index if not exists treatment_photos_client_idx
  on treatment_photos (client_id)
  where client_id is not null;

-- La política de clientas no deja ver la fila a la profesional. Esta función
-- solo responde si la clienta es del centro de quien está logueada.
create or replace function public.client_in_my_salon(p_client text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_client is null
     or p_client !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from clients c
    where c.id = p_client::uuid and c.salon_id = public.my_salon()
  );
end;
$$;

revoke all on function public.client_in_my_salon(text) from public;
grant execute on function public.client_in_my_salon(text) to authenticated;

drop policy if exists photos_all on treatment_photos;
create policy photos_all on treatment_photos for all
  using (
    (treatment_id is not null and exists (
      select 1 from treatments t
      where t.id = treatment_id and t.salon_id = my_salon()
    ))
    or (client_id is not null and client_in_my_salon(client_id::text))
  )
  with check (
    (treatment_id is not null and exists (
      select 1 from treatments t
      where t.id = treatment_id and t.salon_id = my_salon()
    ))
    or (client_id is not null and client_in_my_salon(client_id::text))
  );

drop policy if exists treatment_photos_read on storage.objects;
create policy treatment_photos_read on storage.objects for select
  using (
    bucket_id = 'treatment-photos'
    and (
      exists (
        select 1 from treatments t
        where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
      )
      or (
        (storage.foldername(name))[1] = 'client'
        and client_in_my_salon((storage.foldername(name))[2])
      )
    )
  );

drop policy if exists treatment_photos_insert on storage.objects;
create policy treatment_photos_insert on storage.objects for insert
  with check (
    bucket_id = 'treatment-photos'
    and (
      exists (
        select 1 from treatments t
        where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
      )
      or (
        (storage.foldername(name))[1] = 'client'
        and client_in_my_salon((storage.foldername(name))[2])
      )
    )
  );

drop policy if exists treatment_photos_update on storage.objects;
create policy treatment_photos_update on storage.objects for update
  using (
    bucket_id = 'treatment-photos'
    and (
      exists (
        select 1 from treatments t
        where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
      )
      or (
        (storage.foldername(name))[1] = 'client'
        and client_in_my_salon((storage.foldername(name))[2])
      )
    )
  );

drop policy if exists treatment_photos_delete on storage.objects;
create policy treatment_photos_delete on storage.objects for delete
  using (
    bucket_id = 'treatment-photos'
    and (
      exists (
        select 1 from treatments t
        where t.id::text = (storage.foldername(name))[1] and t.salon_id = my_salon()
      )
      or (
        (storage.foldername(name))[1] = 'client'
        and client_in_my_salon((storage.foldername(name))[2])
      )
    )
  );
