-- Qué cabina de agenda usa cada persona (o ninguna).
-- Las columnas de la agenda siguen siendo staff.role = 'provider' (Cabina 1…).
-- Las personas (dirección/recepción) pueden apuntar a una de esas columnas.

alter table public.staff
  add column if not exists cabin_id uuid references public.staff(id) on delete set null;

comment on column public.staff.cabin_id is
  'Columna de agenda (cabina) donde trabaja. Null = sin cabina en la grilla.';

create index if not exists staff_cabin_id_idx on public.staff (cabin_id)
  where cabin_id is not null;

create or replace function public.staff_cabin_ok()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cabin public.staff%rowtype;
begin
  if new.cabin_id is null then
    return new;
  end if;
  if new.cabin_id = new.id then
    raise exception 'Una persona no puede ser su propia cabina';
  end if;
  select * into cabin from public.staff where id = new.cabin_id;
  if not found then
    raise exception 'Cabina no encontrada';
  end if;
  if cabin.salon_id is distinct from new.salon_id then
    raise exception 'La cabina debe ser del mismo centro';
  end if;
  if cabin.role is distinct from 'provider' then
    raise exception 'cabin_id debe apuntar a un rol Cabina';
  end if;
  return new;
end;
$$;

drop trigger if exists staff_cabin_ok on public.staff;
create trigger staff_cabin_ok
  before insert or update of cabin_id, salon_id, role
  on public.staff
  for each row execute function public.staff_cabin_ok();

-- Arlett Beauty: Tere → Cabina 1, Iria → Cabina 2
update public.staff s
set cabin_id = c.id
from public.staff c
where s.salon_id = '6bbead25-1a38-4d4e-bb6b-4c290a08d74f'
  and c.salon_id = s.salon_id
  and c.role = 'provider'
  and c.is_active is not false
  and (
    (s.full_name ilike 'Tere Anllo%' and c.full_name = 'Cabina 1')
    or (s.full_name ilike 'Iria Ferreiro%' and c.full_name = 'Cabina 2')
  );
