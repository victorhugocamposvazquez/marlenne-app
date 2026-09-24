import SmsSetupNeeded from '@/components/ajustes/SmsSetupNeeded';
import SmsSettingsView from '@/components/ajustes/SmsSettingsView';
import { requireRole } from '@/lib/require-session';
import { ensureSmsSetupForSalon } from '@/lib/sms/setup';
import { createClient } from '@/lib/supabase/server';
import { TZ } from '@/lib/time';

const apptWhen = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

export default async function SmsSettingsPage() {
  const me = await requireRole('admin');
  const sb = createClient();

  const setup = await ensureSmsSetupForSalon(sb, me.salon_id);
  if (!setup.ok) {
    if (setup.reason === 'migration') return <SmsSetupNeeded />;
    return (
      <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-fab pt-5">
        <SmsSetupNeeded />
        <p className="mt-4 text-body text-danger-fg">{setup.message}</p>
      </div>
    );
  }

  const { config, templateBody } = setup;

  const [{ data: logs }, { data: appts }] = await Promise.all([
    sb.from('sms_log')
      .select('id, status, to_phone, body, sent_at, created_at, simulated, delivered_at, error_message, origin')
      .eq('salon_id', me.salon_id)
      .order('created_at', { ascending: false })
      .limit(15),
    sb.from('appointments')
      .select('id, starts_at, client_name, client:clients(full_name), service:services(name)')
      .eq('salon_id', me.salon_id)
      .eq('status', 'prog')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(80),
  ]);

  const testAppointments = (appts ?? []).map(a => {
    const client = a.client as unknown as { full_name: string } | null;
    const service = a.service as unknown as { name: string } | null;
    const name = client?.full_name ?? a.client_name ?? 'Clienta';
    const svc = service?.name ?? 'Cita';
    return {
      id: a.id,
      label: `${name} · ${svc} · ${apptWhen.format(new Date(a.starts_at))}`,
    };
  });

  return (
    <SmsSettingsView
      config={{
        enabled: config.enabled,
        reminder_mode: config.reminder_mode as 'hours_before' | 'day_before_at_hour',
        reminder_hours_before: config.reminder_hours_before,
        reminder_send_hour: config.reminder_send_hour,
        test_mode: config.test_mode,
        sender: config.sender ?? '',
      }}
      templateBody={templateBody}
      logs={logs ?? []}
      testAppointments={testAppointments}
    />
  );
}
