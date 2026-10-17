-- Cobro del bono vendido (total o por tramos), igual patrón que citas.

alter table public.client_packs
  add column if not exists paid_cents int not null default 0
    check (paid_cents >= 0);

alter table public.client_packs
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('cash', 'card', 'bizum', 'mixed'));

alter table public.client_packs
  add column if not exists payment_split jsonb;

comment on column public.client_packs.paid_cents is 'Importe cobrado del bono (céntimos). Puede ser parcial (tramos).';
comment on column public.client_packs.payment_method is 'cash | card | bizum | mixed';
comment on column public.client_packs.payment_split is 'Desglose si payment_method=mixed';
