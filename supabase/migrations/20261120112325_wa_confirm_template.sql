-- Texto de WhatsApp al confirmar una cita. Null = el texto de fábrica de la app.

alter table public.salons
  add column if not exists wa_confirm_template text;

comment on column public.salons.wa_confirm_template is
  'Mensaje que se abre en WhatsApp al confirmar. Null = texto por defecto. Comodines: {{cliente}} {{cuando}} {{servicio}} {{enlace}}.';
