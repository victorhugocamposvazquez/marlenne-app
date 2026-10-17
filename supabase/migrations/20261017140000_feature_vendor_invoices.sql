-- Feature flag Ops: herramientas facturas Amazon/Meta en Finanzas del salón.
-- Off por defecto: solo los negocios que Ops active lo ven.

alter table public.salons
  add column if not exists feature_vendor_invoices boolean not null default false;

comment on column public.salons.feature_vendor_invoices is
  'Si true, el salón ve Herramientas (facturas Amazon Business / Meta) en Finanzas. Lo activa Ops.';
