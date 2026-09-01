-- Categorías de catálogo editables. El slug se copia a services.category
-- para que agenda, voz y CSV sigan agrupando igual.

create table service_categories (
  id               uuid primary key default uuid_generate_v4(),
  salon_id         uuid not null references salons(id) on delete cascade,
  slug             text not null,
  name             text not null,
  color            text not null,
  sort_order       int not null default 0,
  is_active        boolean not null default true,
  opens_treatment  boolean not null default true,
  unique (salon_id, slug)
);
create index on service_categories (salon_id, is_active, sort_order);

alter table service_categories enable row level security;

create policy service_categories_read on service_categories for select
  using (salon_id = my_salon());
create policy service_categories_write on service_categories for all
  using (salon_id = my_salon() and my_role() = 'admin')
  with check (salon_id = my_salon() and my_role() = 'admin');

grant select, insert, update, delete on service_categories to authenticated;

insert into service_categories (salon_id, slug, name, color, sort_order, opens_treatment)
select s.id, v.slug, v.name, v.color, v.sort_order, v.opens_treatment
from salons s
cross join (values
  ('corporal',   'Corporal',          '#8B5CF6', 10, true),
  ('facial',     'Facial',            '#EC4899', 20, true),
  ('laser',      'Depilación láser',  '#0EA5E9', 30, true),
  ('micro',      'Micropigmentación', '#F59E0B', 40, true),
  ('bienestar',  'Bienestar',         '#10B981', 50, true),
  ('valoracion', 'Valoraciones',      '#9B96B8', 60, false)
) as v(slug, name, color, sort_order, opens_treatment);

alter table services
  alter column category type text using category::text;

alter table services
  add column category_id uuid references service_categories(id);

update services svc
   set category_id = c.id
  from service_categories c
 where c.salon_id = svc.salon_id
   and c.slug = svc.category;

update services svc
   set category_id = c.id,
       category = c.slug
  from service_categories c
 where svc.category_id is null
   and c.salon_id = svc.salon_id
   and c.slug = 'corporal';

alter table services
  alter column category_id set not null;

create index on services (salon_id, category_id, is_active, sort_order);

create or replace function sync_service_category_slug()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  select slug into new.category from service_categories where id = new.category_id;
  if new.category is null then
    raise exception 'categoría no válida';
  end if;
  return new;
end $$;

create trigger services_category_slug
  before insert or update of category_id
  on services
  for each row execute function sync_service_category_slug();

drop type if exists service_category;

-- El cuerpo cambia si ya está la columna de packs.
do $mig$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'client_pack_id'
  ) then
    execute $fn$
      create or replace function on_appointment_done() returns trigger
      language plpgsql security definer set search_path = public as $body$
      declare
        svc   services;
        t     treatments;
        abre  boolean;
      begin
        if new.status <> 'done' or old.status = 'done' then return new; end if;

        if new.client_pack_id is not null then
          update client_packs
             set sessions_done = least(sessions_total, sessions_done + 1)
           where id = new.client_pack_id
             and salon_id = new.salon_id;
        end if;

        if new.client_id is null then return new; end if;

        select * into svc from services where id = new.service_id;
        select c.opens_treatment into abre from service_categories c where c.id = svc.category_id;
        if coalesce(abre, svc.category is distinct from 'valoracion') is false then return new; end if;

        select * into t from treatments
         where client_id = new.client_id and service_id = new.service_id and closed_at is null
         order by opened_at desc limit 1;

        if t.id is null then
          insert into treatments (salon_id, client_id, service_id, provider_id,
                                  sessions_done, sessions_total, last_params)
          values (new.salon_id, new.client_id, new.service_id, new.provider_id,
                  1, greatest(svc.default_sessions, 1),
                  (select coalesce(jsonb_object_agg(k, ''), '{}') from unnest(svc.param_keys) k))
          returning * into t;
        else
          update treatments
             set sessions_done = least(sessions_total, sessions_done + 1)
           where id = t.id
          returning * into t;
        end if;

        update appointments
           set treatment_id = t.id, session_no = t.sessions_done
         where id = new.id;

        if t.sessions_done >= t.sessions_total then
          update treatments set closed_at = current_date where id = t.id;
        end if;

        return new;
      end
      $body$;
    $fn$;
  else
    execute $fn$
      create or replace function on_appointment_done() returns trigger
      language plpgsql security definer set search_path = public as $body$
      declare
        svc   services;
        t     treatments;
        abre  boolean;
      begin
        if new.status <> 'done' or old.status = 'done' then return new; end if;
        if new.client_id is null then return new; end if;

        select * into svc from services where id = new.service_id;
        select c.opens_treatment into abre from service_categories c where c.id = svc.category_id;
        if coalesce(abre, svc.category is distinct from 'valoracion') is false then return new; end if;

        select * into t from treatments
         where client_id = new.client_id and service_id = new.service_id and closed_at is null
         order by opened_at desc limit 1;

        if t.id is null then
          insert into treatments (salon_id, client_id, service_id, provider_id,
                                  sessions_done, sessions_total, last_params)
          values (new.salon_id, new.client_id, new.service_id, new.provider_id,
                  1, greatest(svc.default_sessions, 1),
                  (select coalesce(jsonb_object_agg(k, ''), '{}') from unnest(svc.param_keys) k))
          returning * into t;
        else
          update treatments
             set sessions_done = least(sessions_total, sessions_done + 1)
           where id = t.id
          returning * into t;
        end if;

        update appointments
           set treatment_id = t.id, session_no = t.sessions_done
         where id = new.id;

        if t.sessions_done >= t.sessions_total then
          update treatments set closed_at = current_date where id = t.id;
        end if;

        return new;
      end
      $body$;
    $fn$;
  end if;
end
$mig$;
