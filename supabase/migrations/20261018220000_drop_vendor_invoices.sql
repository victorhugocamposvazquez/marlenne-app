-- Retira facturas Amazon/Meta (feature cancelada).
-- No se puede DELETE en storage.objects desde SQL (Storage API); el bucket
-- vacío o huérfano se puede borrar luego en Dashboard → Storage si molesta.

drop policy if exists salon_vendor_invoices_read on storage.objects;
drop policy if exists salon_vendor_invoices_insert on storage.objects;
drop policy if exists salon_vendor_invoices_update on storage.objects;
drop policy if exists salon_vendor_invoices_delete on storage.objects;

drop table if exists public.salon_vendor_invoices;
drop table if exists public.salon_vendor_connections;

alter table public.salons drop column if exists feature_vendor_invoices;
alter table public.salons drop column if exists gestoria_email;
alter table public.salons drop column if exists gestoria_whatsapp;

-- Intenta quitar el bucket solo si no tiene objetos (si falla, ignorar).
do $$
begin
  delete from storage.buckets where id = 'salon-vendor-invoices'
    and not exists (
      select 1 from storage.objects where bucket_id = 'salon-vendor-invoices' limit 1
    );
exception
  when others then
    raise notice 'Bucket salon-vendor-invoices no eliminado: %', sqlerrm;
end $$;
