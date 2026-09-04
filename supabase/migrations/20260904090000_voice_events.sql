-- Lo dictado por voz que no salió bien: texto + qué pasó. Solo para afinar el oído.
-- Se guarda 30 días (la propia RPC purga) y solo lo ve el admin en Ajustes.

create table voice_events (
  id          uuid primary key default uuid_generate_v4(),
  salon_id    uuid not null references salons(id) on delete cascade,
  staff_id    uuid,
  said        text not null,
  outcome     text not null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index on voice_events (salon_id, created_at desc);

alter table voice_events enable row level security;

create policy voice_events_read on voice_events for select
  using (salon_id = my_salon() and my_role() = 'admin');

grant select on voice_events to authenticated;

create or replace function public.voice_report(p_said text, p_outcome text, p_detail text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salon uuid := my_salon();
begin
  if auth.uid() is null or v_salon is null then
    raise exception 'sin sesión';
  end if;
  if length(trim(coalesce(p_said, ''))) = 0 then
    return;
  end if;
  insert into voice_events (salon_id, staff_id, said, outcome, detail)
  values (v_salon, auth.uid(), left(trim(p_said), 200), left(p_outcome, 40), left(p_detail, 200));
  delete from voice_events
   where salon_id = v_salon
     and created_at < now() - interval '30 days';
end $$;

grant execute on function public.voice_report(text, text, text) to authenticated;
