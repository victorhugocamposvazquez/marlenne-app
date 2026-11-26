-- Respuestas del formulario de Meta por lead (además de nombre/teléfono).

alter table public.leads
  add column if not exists form_fields jsonb not null default '[]'::jsonb;

comment on column public.leads.form_fields is
  'Preguntas y respuestas del lead gen de Meta; se muestran en la ficha.';