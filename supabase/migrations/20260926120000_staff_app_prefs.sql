-- Preferencias de app por usuario (mismo login en varios móviles + soporte Ops).

alter table public.staff
  add column if not exists app_prefs jsonb not null default '{}'::jsonb;

comment on column public.staff.app_prefs is
  'Preferencias sincronizadas del dispositivo (voz, etc.) para auth.uid().';

create or replace function public.merge_my_app_prefs(patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if patch ? 'voice' then
    update public.staff
    set app_prefs = jsonb_set(
      coalesce(app_prefs, '{}'::jsonb),
      '{voice}',
      coalesce(app_prefs->'voice', '{}'::jsonb) || coalesce(patch->'voice', '{}'::jsonb)
    )
    where id = auth.uid();
  else
    update public.staff
    set app_prefs = coalesce(app_prefs, '{}'::jsonb) || coalesce(patch, '{}'::jsonb)
    where id = auth.uid();
  end if;
end;
$$;

grant execute on function public.merge_my_app_prefs(jsonb) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.staff;
exception
  when duplicate_object then null;
end $$;
