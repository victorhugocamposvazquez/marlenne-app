-- El reloj sigue mirando cada minuto (una consulta a appointments, casi gratis),
-- pero solo llama a la web si hay alguna cita programada que empiece en los próximos 30 minutos
-- sin aviso enviado y con alguien del equipo que quiera recibirlos.

create or replace function private.ping_staff_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if not exists (
    select 1
      from public.appointments a
      join public.staff s
        on s.salon_id = a.salon_id
       and s.is_active
       and s.notify_upcoming
     where a.status = 'prog'
       and a.staff_reminded_at is null
       and a.starts_at > now()
       and a.starts_at <= now() + interval '30 minutes'
  ) then
    return;
  end if;

  select decrypted_secret
    into v_secret
    from vault.decrypted_secrets
   where name = 'staff_reminders_cron_secret'
   limit 1;

  if v_secret is null then
    return;
  end if;

  perform net.http_get(
    url := 'https://marlenne-app.vercel.app/api/cron/staff-reminders',
    headers := jsonb_build_object('x-cron-secret', v_secret),
    timeout_milliseconds := 15000
  );
end;
$$;

revoke all on function private.ping_staff_reminders() from public;
