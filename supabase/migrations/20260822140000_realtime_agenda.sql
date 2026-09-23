-- Recepción y cabina miran la misma agenda: los cambios llegan al cliente.
-- Si la tabla ya está en la publicación (el panel de Supabase también la añade), no falla.
do $$
begin
  alter publication supabase_realtime add table appointments;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table time_blocks;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table waitlist;
exception
  when duplicate_object then null;
end $$;

-- Una profesional que abre la ficha desde su cita debe poder leer a esa clienta.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'clients_provider_read'
  ) then
    execute $policy$
      create policy clients_provider_read on clients for select
      using (
        salon_id = my_salon()
        and my_role() = 'provider'
        and exists (
          select 1 from appointments a
          where a.client_id = clients.id and a.provider_id = auth.uid()
        )
      )
    $policy$;
  end if;
end $$;
