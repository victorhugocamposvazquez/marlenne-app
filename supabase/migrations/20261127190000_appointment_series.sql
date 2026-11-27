-- Agrupa las citas creadas juntas como recurrentes. Sin la columna, el alta sigue guardando cada cita.

alter table public.appointments
  add column if not exists series_id uuid;

create index if not exists appointments_series_idx
  on public.appointments (series_id)
  where series_id is not null;
