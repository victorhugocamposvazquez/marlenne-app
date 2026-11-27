-- Día opcional de «Volver a llamar». La etiqueta sigue en tags; la fecha va aparte.

alter table public.leads
  add column if not exists callback_at date;

comment on column public.leads.callback_at is
  'Día para volver a llamar. Vacío si la etiqueta no lleva fecha.';
