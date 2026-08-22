-- Recepción y cabina miran la misma agenda: los cambios llegan al cliente.
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table time_blocks;
alter publication supabase_realtime add table waitlist;

-- Una profesional que abre la ficha desde su cita debe poder leer a esa clienta.
create policy clients_provider_read on clients for select
  using (
    salon_id = my_salon()
    and my_role() = 'provider'
    and exists (
      select 1 from appointments a
      where a.client_id = clients.id and a.provider_id = auth.uid()
    )
  );
