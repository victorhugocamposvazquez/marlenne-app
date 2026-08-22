import { createAdminClient } from '@/lib/supabase/admin';

export type ReadyItem = {
  ok: boolean;
  label: string;
  hint: string;
};

/** Lo que hay que tener cerrado antes de meter clientas reales. */
export async function getReadyStatus(): Promise<ReadyItem[]> {
  const smsReady = !!(
    process.env.TWILIO_ACCOUNT_SID
    && process.env.TWILIO_AUTH_TOKEN
    && process.env.TWILIO_FROM
    && process.env.CRON_SECRET
  );

  let demoStaff = 0;
  let demoClients = 0;
  try {
    const admin = createAdminClient();
    const [{ data: staff }, { data: users }, { data: clients }] = await Promise.all([
      admin.from('staff').select('id').eq('is_active', true),
      admin.auth.admin.listUsers({ perPage: 200 }),
      admin.from('clients').select('id, email'),
    ]);
    const emailById = new Map((users?.users ?? []).map(u => [u.id, u.email ?? '']));
    demoStaff = (staff ?? []).filter(s => (emailById.get(s.id) ?? '').endsWith('@marlenne.test')).length;
    demoClients = (clients ?? []).filter(c => (c.email ?? '').endsWith('@demo.test')).length;
  } catch {
    // Sin service role no se puede contar; el resto del checklist sí.
  }

  return [
    {
      ok: smsReady,
      label: 'Recordatorios SMS',
      hint: smsReady
        ? 'Twilio y el cron están listos.'
        : 'Faltan TWILIO_* o CRON_SECRET en Vercel. Hasta entonces el cron no manda nada.',
    },
    {
      ok: demoStaff === 0,
      label: 'Cuentas de demo',
      hint: demoStaff
        ? `${demoStaff} personas siguen con @marlenne.test. Crea las reales en Equipo y desactiva estas.`
        : 'No quedan emails de demo activos.',
    },
    {
      ok: demoClients === 0,
      label: 'Fichas de siembra',
      hint: demoClients
        ? `${demoClients} clientas de demo (@demo.test). Bórralas antes de datos de salud reales.`
        : 'No hay clientas de siembra.',
    },
  ];
}
