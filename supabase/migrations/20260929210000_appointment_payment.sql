-- Cobro por cita: previstos (price_cents) vs cobrado real.

alter table public.appointments
  add column if not exists paid_cents int not null default 0
    check (paid_cents >= 0);

alter table public.appointments
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('cash', 'card', 'bizum', 'mixed'));

comment on column public.appointments.paid_cents is 'Euros cobrados (céntimos). Independiente del estado clínico.';
comment on column public.appointments.payment_method is 'cash | card | bizum | mixed';
