-- Preferencias de agenda del centro (cobro, citas sin llegar).

alter table public.salons
  add column if not exists feature_appt_payment boolean not null default true;

alter table public.salons
  add column if not exists feature_overdue_appts boolean not null default true;

comment on column public.salons.feature_appt_payment is
  'Si true, la ficha de cita muestra cobro (previsto vs cobrado) y Hoy usa paid_cents en caja.';
comment on column public.salons.feature_overdue_appts is
  'Si true, Hoy muestra la sección Citas sin llegar (agendada y con más de 10 min de retraso).';

drop policy if exists salon_admin_update on public.salons;
create policy salon_admin_update on public.salons
  for update
  using (id = my_salon() and my_role() = 'admin')
  with check (id = my_salon() and my_role() = 'admin');
