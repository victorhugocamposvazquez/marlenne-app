import { createAdminClient } from '@/lib/supabase/admin';
import { toGsmSafeText } from '@/lib/sms/gsm';
import {
  generateSubid,
  isLabsMobileConfigured,
  isLabsMobileTestModeForced,
  sendSmsLabsMobile,
} from '@/lib/sms/labsmobile';
import { checkPhoneForSms, normalizePhoneE164 } from '@/lib/sms/phone';
import { aliasServicio, loadServiceAliases } from '@/lib/sms/service-aliases';
import { renderSmsTemplate } from '@/lib/sms/templates';
import { DEFAULT_TIMEZONE, zonedNaiveToDate } from '@/lib/sms/tz';

export type SmsConfigRow = {
  salon_id: string;
  enabled: boolean;
  reminder_mode: 'hours_before' | 'day_before_at_hour';
  reminder_hours_before: number;
  reminder_send_hour: number;
  timezone: string;
  test_mode: boolean;
  sender: string | null;
};

export type PreviaReminder = {
  client_phone: string | null;
  reminder_sent_at: string | null;
  starts_at: string;
};

/** Campos que reabren el recordatorio (teléfono, hora o vencimiento distintos). */
export const RESET_AVISO = {
  reminder_sent_at: null,
  reminder_skipped_reason: null,
  reminder_skipped_phone: null,
} as const;

const APPT_SELECT = `
  id, salon_id, client_id, client_name, starts_at, status,
  reminder_due_at, reminder_sent_at, reminder_skipped_reason, reminder_skipped_phone,
  client:clients(full_name, phone, sms_opt_in),
  service:services(name),
  provider:staff!appointments_provider_id_fkey(full_name)
`;

type ClientJoin = { full_name: string; phone: string | null; sms_opt_in: boolean } | null;
type ServiceJoin = { name: string } | null;
type StaffJoin = { full_name: string } | null;

export type AppointmentSmsRow = {
  id: string;
  salon_id: string;
  client_id: string | null;
  client_name: string | null;
  starts_at: string;
  status: string;
  reminder_due_at: string | null;
  reminder_sent_at: string | null;
  reminder_skipped_reason: string | null;
  reminder_skipped_phone: string | null;
  client: ClientJoin;
  service: ServiceJoin;
  provider: StaffJoin;
};

type PlantillaRow = { clave: string; cuerpo: string; activa: boolean };

export function isTestMode(config: Partial<Pick<SmsConfigRow, 'test_mode'>>): boolean {
  if (typeof config.test_mode !== 'boolean') return true;
  return config.test_mode || isLabsMobileTestModeForced();
}

function formatInTimeZone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('es-ES', { timeZone, ...options }).format(date);
}

/** Calcula cuándo debe enviarse el recordatorio. */
export function computeReminderDueAt(
  startsAt: Date,
  config: Pick<SmsConfigRow, 'reminder_mode' | 'reminder_hours_before' | 'reminder_send_hour' | 'timezone'>,
): Date {
  if (config.reminder_mode === 'hours_before') {
    return new Date(startsAt.getTime() - config.reminder_hours_before * 60 * 60 * 1000);
  }

  const tz = config.timezone || DEFAULT_TIMEZONE;
  const ymdParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(startsAt);
  const yy = ymdParts.find((p) => p.type === 'year')!.value;
  const mm = ymdParts.find((p) => p.type === 'month')!.value;
  const dd = ymdParts.find((p) => p.type === 'day')!.value;
  const civil = new Date(`${yy}-${mm}-${dd}T00:00:00Z`);
  civil.setUTCDate(civil.getUTCDate() - 1);
  const by = civil.getUTCFullYear();
  const bm = String(civil.getUTCMonth() + 1).padStart(2, '0');
  const bd = String(civil.getUTCDate()).padStart(2, '0');
  const hh = String(config.reminder_send_hour).padStart(2, '0');

  return zonedNaiveToDate(`${by}-${bm}-${bd} ${hh}:00:00`, tz) ?? startsAt;
}

function telefonoCambiado(anterior: string | null, actual: string | null): boolean {
  return normalizePhoneE164(anterior) !== normalizePhoneE164(actual);
}

function horaCitaCambiada(anteriorIso: string | null | undefined, nueva: Date): boolean {
  if (!anteriorIso) return false;
  const anterior = new Date(anteriorIso).getTime();
  if (Number.isNaN(anterior)) return false;
  return Math.abs(anterior - nueva.getTime()) >= 5 * 60 * 1000;
}

export function avisoQuedoObsoleto(
  sentAt: string | null | undefined,
  nuevoDueAt: Date | null,
): boolean {
  if (!sentAt || !nuevoDueAt) return false;
  const sent = new Date(sentAt).getTime();
  if (Number.isNaN(sent)) return false;
  return nuevoDueAt.getTime() - sent >= 12 * 60 * 60 * 1000;
}

export function debeReabrirAviso(
  previa: PreviaReminder | null | undefined,
  telefono: string | null,
  startsAt: Date | null,
  reminderDueAt: Date | null,
): boolean {
  if (!previa) return false;
  return (
    telefonoCambiado(previa.client_phone, telefono)
    || (startsAt != null && horaCitaCambiada(previa.starts_at, startsAt))
    || avisoQuedoObsoleto(previa.reminder_sent_at, reminderDueAt)
  );
}

export function clientPhoneOf(appt: Pick<AppointmentSmsRow, 'client'>): string | null {
  return appt.client?.phone ?? null;
}

export function clientNameOf(appt: Pick<AppointmentSmsRow, 'client' | 'client_name'>): string | null {
  return appt.client?.full_name ?? appt.client_name;
}

export async function loadSmsConfig(salonId: string): Promise<SmsConfigRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sms_config')
    .select('*')
    .eq('salon_id', salonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return {
      salon_id: salonId,
      enabled: true,
      reminder_mode: 'day_before_at_hour',
      reminder_hours_before: 24,
      reminder_send_hour: 21,
      timezone: DEFAULT_TIMEZONE,
      test_mode: true,
      sender: null,
    };
  }
  return data as SmsConfigRow;
}

export async function loadPlantilla(
  salonId: string,
  clave = 'recordatorio_cita',
): Promise<PlantillaRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sms_templates')
    .select('clave, cuerpo, activa')
    .eq('salon_id', salonId)
    .eq('clave', clave)
    .maybeSingle();
  if (error || !data?.activa || !data.cuerpo) return null;
  return data as PlantillaRow;
}

export function renderReminderBody(
  appt: Pick<AppointmentSmsRow, 'client' | 'client_name' | 'service' | 'provider' | 'starts_at'>,
  timeZone: string,
  cuerpoPlantilla: string,
  aliasServicios: Record<string, string> = {},
): string {
  const startsAt = new Date(appt.starts_at);
  const dia = formatInTimeZone(startsAt, timeZone, { weekday: 'long' }).toLowerCase();
  const fecha = formatInTimeZone(startsAt, timeZone, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '-');
  const hora = formatInTimeZone(startsAt, timeZone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const servicio =
    aliasServicio(appt.service?.name, aliasServicios)
    ?? appt.service?.name?.toUpperCase()
    ?? undefined;

  return toGsmSafeText(
    renderSmsTemplate(cuerpoPlantilla, {
      cliente: clientNameOf(appt) ?? undefined,
      servicio,
      dia,
      fecha,
      hora,
      profesional: appt.provider?.full_name ?? undefined,
    }),
  );
}

type SmsLogInsert = {
  appointment_id: string;
  salon_id: string;
  to_phone: string;
  body: string;
  status: string;
  provider?: string;
  provider_subid?: string | null;
  template_key?: string;
  sent_at?: string | null;
  simulated?: boolean;
  origin?: 'automatico' | 'prueba';
  error_message?: string | null;
};

async function upsertSmsLog(row: SmsLogInsert) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('sms_log').upsert(row, {
    onConflict: 'appointment_id,to_phone',
  });
  if (error) console.error('[sms] upsert sms_log', row.appointment_id, error.message);
}

export type EnvioPuntualResultado =
  | { ok: true; telefono: string; cuerpo: string; simulado: boolean }
  | { ok: false; error: string };

/** Envío manual de recordatorio para una cita concreta. */
export async function sendReminderForAppointment(
  appointmentId: string,
  opciones: { forzarReal?: boolean } = {},
): Promise<EnvioPuntualResultado> {
  if (!isLabsMobileConfigured()) {
    return { ok: false, error: 'LabsMobile no configurado' };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select(APPT_SELECT)
    .eq('id', appointmentId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'La cita no existe' };

  const appt = data as unknown as AppointmentSmsRow;
  if (appt.status !== 'prog') {
    return { ok: false, error: 'La cita no está programada' };
  }
  if (appt.client && !appt.client.sms_opt_in) {
    return { ok: false, error: 'La clienta no tiene SMS activado' };
  }

  const config = await loadSmsConfig(appt.salon_id);
  const plantilla = await loadPlantilla(appt.salon_id);
  if (!plantilla) {
    return { ok: false, error: 'Plantilla recordatorio_cita no disponible o inactiva' };
  }

  const telefono = checkPhoneForSms(clientPhoneOf(appt));
  if (!telefono.ok) {
    return { ok: false, error: `Teléfono no válido: ${telefono.label}` };
  }

  const simulado = opciones.forzarReal ? false : isTestMode(config);
  const cuerpo = renderReminderBody(
    appt,
    config.timezone,
    plantilla.cuerpo,
    await loadServiceAliases(appt.salon_id),
  );
  const subid = generateSubid();
  const nowIso = new Date().toISOString();
  const result = await sendSmsLabsMobile(telefono.phone, cuerpo, {
    subid,
    test: simulado,
    sender: config.sender ?? undefined,
  });

  if (!result.ok) {
    await upsertSmsLog({
      appointment_id: appt.id,
      salon_id: appt.salon_id,
      to_phone: telefono.phone,
      body: cuerpo,
      status: 'failed',
      template_key: plantilla.clave,
      sent_at: nowIso,
      simulated: simulado,
      origin: 'prueba',
      error_message: result.error,
    });
    return { ok: false, error: result.error };
  }

  await supabase
    .from('appointments')
    .update({
      reminder_sent_at: nowIso,
      reminder_skipped_reason: null,
      reminder_skipped_phone: null,
      updated_at: nowIso,
    })
    .eq('id', appt.id);

  await upsertSmsLog({
    appointment_id: appt.id,
    salon_id: appt.salon_id,
    to_phone: telefono.phone,
    body: cuerpo,
    status: 'sent',
    provider: 'labsmobile',
    provider_subid: result.subid ?? subid,
    template_key: plantilla.clave,
    sent_at: nowIso,
    simulated: simulado,
    origin: 'prueba',
  });

  return { ok: true, telefono: telefono.phone, cuerpo, simulado };
}

export type ProcessDueRemindersResult = {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  simulado: boolean;
  errors: string[];
};

/** Procesa recordatorios vencidos. Opcionalmente filtra por centro. */
export async function processDueReminders(
  opts: { salonId?: string } = {},
): Promise<ProcessDueRemindersResult> {
  const errors: string[] = [];

  if (!isLabsMobileConfigured()) {
    return {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      simulado: true,
      errors: ['LabsMobile no configurado (falta LABSMOBILE_USERNAME / LABSMOBILE_API_TOKEN)'],
    };
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const dueLimitIso = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  let configQuery = supabase.from('sms_config').select('salon_id, enabled, test_mode');
  if (opts.salonId) configQuery = configQuery.eq('salon_id', opts.salonId);
  const { data: configs, error: cfgErr } = await configQuery;
  if (cfgErr) {
    return { processed: 0, sent: 0, skipped: 0, failed: 0, simulado: true, errors: [cfgErr.message] };
  }

  const enabledSalons = new Set(
    (configs ?? []).filter((c) => c.enabled).map((c) => c.salon_id as string),
  );
  if (enabledSalons.size === 0) {
    return {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      simulado: true,
      errors: ['Recordatorios desactivados en sms_config'],
    };
  }

  let apptQuery = supabase
    .from('appointments')
    .select(APPT_SELECT)
    .eq('status', 'prog')
    .is('reminder_sent_at', null)
    .lte('reminder_due_at', dueLimitIso)
    .gt('starts_at', nowIso)
    .order('reminder_due_at', { ascending: true })
    .limit(100);

  if (opts.salonId) apptQuery = apptQuery.eq('salon_id', opts.salonId);

  const { data: appts, error: apptsErr } = await apptQuery;
  if (apptsErr) {
    return { processed: 0, sent: 0, skipped: 0, failed: 0, simulado: true, errors: [apptsErr.message] };
  }

  const list = ((appts ?? []) as unknown as AppointmentSmsRow[]).filter((a) => enabledSalons.has(a.salon_id));
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const configCache = new Map<string, SmsConfigRow>();
  const plantillaCache = new Map<string, PlantillaRow | null>();
  const aliasCache = new Map<string, Record<string, string>>();

  async function salonBundle(salonId: string) {
    if (!configCache.has(salonId)) {
      configCache.set(salonId, await loadSmsConfig(salonId));
      plantillaCache.set(salonId, await loadPlantilla(salonId));
      aliasCache.set(salonId, await loadServiceAliases(salonId));
    }
    return {
      config: configCache.get(salonId)!,
      plantilla: plantillaCache.get(salonId),
      alias: aliasCache.get(salonId)!,
    };
  }

  let simulado = true;

  for (const appt of list) {
    const { config, plantilla, alias } = await salonBundle(appt.salon_id);
    simulado = isTestMode(config);

    if (!plantilla) {
      errors.push(`${appt.id}: plantilla recordatorio_cita no disponible`);
      continue;
    }

    const rawPhone = clientPhoneOf(appt);
    const cuerpo = renderReminderBody(appt, config.timezone, plantilla.cuerpo, alias);

    if (appt.client && !appt.client.sms_opt_in) {
      skipped += 1;
      const yaRegistrado = appt.reminder_skipped_reason === 'SMS desactivado';
      if (yaRegistrado) continue;

      await supabase
        .from('appointments')
        .update({
          reminder_skipped_reason: 'SMS desactivado',
          reminder_skipped_phone: rawPhone ?? '',
          updated_at: nowIso,
        })
        .eq('id', appt.id);

      await upsertSmsLog({
        appointment_id: appt.id,
        salon_id: appt.salon_id,
        to_phone: rawPhone ?? '',
        body: cuerpo,
        status: 'skipped',
        template_key: plantilla.clave,
        sent_at: nowIso,
        error_message: 'SMS desactivado',
      });
      continue;
    }

    const telefono = checkPhoneForSms(rawPhone);
    if (!telefono.ok) {
      skipped += 1;
      const yaRegistrado =
        appt.reminder_skipped_phone !== null
        && appt.reminder_skipped_phone === (rawPhone ?? '');
      if (yaRegistrado) continue;

      await supabase
        .from('appointments')
        .update({
          reminder_skipped_reason: telefono.label,
          reminder_skipped_phone: rawPhone ?? '',
          updated_at: nowIso,
        })
        .eq('id', appt.id);

      await upsertSmsLog({
        appointment_id: appt.id,
        salon_id: appt.salon_id,
        to_phone: rawPhone ?? '',
        body: cuerpo,
        status: 'skipped',
        template_key: plantilla.clave,
        sent_at: nowIso,
        error_message: telefono.label,
      });
      continue;
    }

    const phone = telefono.phone;
    const subid = generateSubid();

    const { data: claimed } = await supabase
      .from('appointments')
      .update({
        reminder_sent_at: nowIso,
        reminder_skipped_reason: null,
        reminder_skipped_phone: null,
        updated_at: nowIso,
      })
      .eq('id', appt.id)
      .is('reminder_sent_at', null)
      .select('id')
      .maybeSingle();
    if (!claimed) continue;

    const result = await sendSmsLabsMobile(phone, cuerpo, {
      subid,
      test: simulado,
      sender: config.sender ?? undefined,
    });

    if (!result.ok) {
      failed += 1;
      errors.push(`${appt.id}: ${result.error}`);
      await supabase
        .from('appointments')
        .update({ reminder_sent_at: null, updated_at: new Date().toISOString() })
        .eq('id', appt.id)
        .eq('reminder_sent_at', nowIso);
      await upsertSmsLog({
        appointment_id: appt.id,
        salon_id: appt.salon_id,
        to_phone: phone,
        body: cuerpo,
        status: 'failed',
        template_key: plantilla.clave,
        sent_at: nowIso,
        simulated: simulado,
        error_message: result.error,
      });
      if (result.status === 401 || result.status === 403) break;
      continue;
    }

    sent += 1;
    await upsertSmsLog({
      appointment_id: appt.id,
      salon_id: appt.salon_id,
      to_phone: phone,
      body: cuerpo,
      status: 'sent',
      provider: 'labsmobile',
      provider_subid: result.subid ?? subid,
      template_key: plantilla.clave,
      sent_at: nowIso,
      simulated: simulado,
      origin: 'automatico',
    });
  }

  return {
    processed: list.length,
    sent,
    skipped,
    failed,
    simulado,
    errors,
  };
}
