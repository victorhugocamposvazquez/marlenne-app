import { redirect } from 'next/navigation';
import SmsSettingsView from '@/components/ajustes/SmsSettingsView';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { TZ } from '@/lib/time';

const apptWhen = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

export default async function SmsSettingsPage() {
  const me = await requireRole('admin');
  const sb = createClient();

  const [{ data: config }, { data: template }, { data: logs }, { data: appts }] = await Promise.all([
    sb.from('sms_config').select('*').eq('salon_id', me.salon_id).maybeSingle(),
    sb.from('sms_templates').select('cuerpo').eq('salon_id', me.salon_id)
      .eq('clave', 'recordatorio_cita').maybeSingle(),
    sb.from('sms_log')
      .select('id, status, to_phone, body, sent_at, created_at, simulated, delivered_at, error_message, origin')
      .eq('salon_id', me.salon_id)
      .order('created_at', { ascending: false })
      .limit(15),
    sb.from('appointments')
      .select('id, starts_at, client:clients(full_name), service:services(name)')
      .eq('salon_id', me.salon_id)
      .eq('status', 'prog')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(10),
  ]);

  if (!config) redirect('/ajustes');

  const testAppointments = (appts ?? []).map(a => {
    const client = a.client as unknown as { full_name: string } | null;
    const service = a.service as unknown as { name: string } | null;
    const name = client?.full_name ?? 'Clienta';
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
      }}
      templateBody={template?.cuerpo ?? ''}
      logs={logs ?? []}
      testAppointments={testAppointments}
    />
  );
}
