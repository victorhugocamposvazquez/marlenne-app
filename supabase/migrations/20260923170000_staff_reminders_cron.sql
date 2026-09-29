-- Aviso al equipo 30 minutos antes de cada cita, sin depender de que la app esté abierta.
-- Vercel Hobby solo permite un cron al día, así que el reloj vive en Postgres (pg_cron + pg_net).
-- Cada minuto llama a /api/cron/staff-reminders con el secreto guardado en Vault.
-- El secreto NO va en esta migración: se guarda con vault.create_secret('…', 'staff_reminders_cron_secret').

create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists private;

create or replace function private.ping_staff_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
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

do $$
begin
  if exists (select 1 from cron.job where jobname = 'staff-reminders') then
    perform cron.unschedule('staff-reminders');
  end if;
end;
$$;

select cron.schedule(
  'staff-reminders',
  '* * * * *',
  $$select private.ping_staff_reminders()$$
);
