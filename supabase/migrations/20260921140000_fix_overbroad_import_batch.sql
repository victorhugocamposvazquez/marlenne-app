-- Corrige un lote que agrupó clientas de semanas distintas (p. ej. 1807 en vez de ~900).
-- Etiqueta solo el día con más altas recientes; el resto del lote queda sin etiqueta.

do $$
declare
  v_salon_id uuid;
  v_batch_id uuid;
  v_peak_day date;
  v_count int;
begin
  select b.id, b.salon_id
  into v_batch_id, v_salon_id
  from import_batches b
  where b.kind = 'session'
  order by b.clients_created desc nulls last, b.created_at desc
  limit 1;

  if v_batch_id is null then
    raise notice 'No hay lote session';
    return;
  end if;

  select date_trunc('day', c.created_at at time zone 'Europe/Madrid')::date
  into v_peak_day
  from clients c
  where c.import_batch_id = v_batch_id
  group by 1
  order by count(*) desc
  limit 1;

  if v_peak_day is null then
    raise notice 'Lote sin clientas';
    return;
  end if;

  update clients
  set import_batch_id = null
  where import_batch_id = v_batch_id
    and date_trunc('day', created_at at time zone 'Europe/Madrid')::date <> v_peak_day;

  select count(*) into v_count from clients where import_batch_id = v_batch_id;

  update import_batches
  set rows_created = v_count,
      clients_created = v_count,
      created_at = (
        select min(created_at) from clients where import_batch_id = v_batch_id
      )
  where id = v_batch_id;

  raise notice 'Lote % ajustado: % client@s del día %', v_batch_id, v_count, v_peak_day;
end $$;
