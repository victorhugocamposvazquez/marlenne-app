-- Color propio del servicio. Si es null, la agenda usa el de la categoría.

alter table services
  add column if not exists color text;
