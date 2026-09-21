-- La API de Supabase necesita GRANT explícito además de RLS.

grant usage on type import_kind to authenticated;
grant select, insert, update, delete on table import_batches to authenticated;
