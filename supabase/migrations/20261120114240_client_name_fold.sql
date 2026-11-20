-- Nombre sin acentos para el buscador. «María» y «Maria» encuentran a la misma clienta.
-- El abecedario es el de fold() en marlen-app/lib/voice.ts.

create or replace function public.fold_text(input text)
returns text
language sql
immutable
parallel safe
as $$
  select translate(
    lower(coalesce(input, '')),
    'áàäâãåéèëêíìïîóòöôõúùüûýÿñç',
    'aaaaaaeeeeiiiiooooouuuuyync'
  );
$$;

alter table public.clients
  add column if not exists name_fold text
  generated always as (public.fold_text(full_name)) stored;

comment on column public.clients.name_fold is
  'full_name en minúsculas y sin acentos. Lo usa el buscador.';
