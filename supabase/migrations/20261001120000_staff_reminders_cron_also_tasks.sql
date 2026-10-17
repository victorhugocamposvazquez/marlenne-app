-- Restaura el ping cada minuto (el filtro «solo si hay citas» dejó sin
-- avisos de tareas y, en la práctica, sin registros de staff-reminders).
-- Envía el secreto como Bearer y x-cron-secret (mismo valor que CRON_SECRET
-- en Vercel; en Vault: staff_reminders_cron_secret).

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

  -- Alias por si el secreto se guardó con el nombre de la env de Vercel.
  if v_secret is null then
    select decrypted_secret
      into v_secret
      from vault.decrypted_secrets
     where name = 'cron_secret'
     limit 1;
  end if;

  if v_secret is null then
    return;
  end if;

  perform net.http_get(
    url := 'https://marlenne-app.vercel.app/api/cron/staff-reminders',
    headers := jsonb_build_object(
      'x-cron-secret', v_secret,
      'Authorization', 'Bearer ' || v_secret
    ),
    timeout_milliseconds := 15000
  );
end;
$$;

revoke all on function private.ping_staff_reminders() from public;

-- Asegura que el job sigue programado cada minuto.
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

create index if not exists salon_tasks_remind_pending_idx
  on public.salon_tasks (remind_at)
  where reminded_at is null and done_at is null and remind_at is not null;
