-- PostgREST necesita FK treatment_photos → treatments para el embed.
-- Si la tabla existe sin REFERENCES, el API a veces filtra por client_id inexistente.

do $$
begin
  if to_regclass('public.treatment_photos') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.treatment_photos'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) like '%treatment_id%'
      and pg_get_constraintdef(oid) like '%treatments%'
  ) then
    alter table public.treatment_photos
      add constraint treatment_photos_treatment_id_fkey
      foreign key (treatment_id) references public.treatments(id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.treatment_photos to authenticated;

notify pgrst, 'reload schema';