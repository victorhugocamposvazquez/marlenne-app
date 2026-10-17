-- Desglose de cobro mixto: { "cash": 2000, "card": 2500 } en céntimos.

alter table public.appointments
  add column if not exists payment_split jsonb;

comment on column public.appointments.payment_split is
  'Solo con payment_method=mixed. Claves cash|card|bizum → céntimos >= 0. paid_cents = suma.';
