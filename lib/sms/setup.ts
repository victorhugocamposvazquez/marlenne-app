import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_TEMPLATE =
  'Hola {{cliente}}, te recordamos tu cita de {{servicio}} el {{dia}} {{fecha}} a las {{hora}}. ¡Te esperamos!';

export function isSmsSchemaMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || msg.includes('does not exist')
    || msg.includes('could not find the table')
  );
}

export type SmsConfigRow = {
  salon_id: string;
  enabled: boolean;
  reminder_mode: string;
  reminder_hours_before: number;
  reminder_send_hour: number;
  timezone: string;
  test_mode: boolean;
  sender: string | null;
};

/** Crea filas SMS por defecto si la migración está aplicada pero faltan datos del centro. */
export async function ensureSmsSetupForSalon(
  sb: SupabaseClient,
  salonId: string,
): Promise<
  | { ok: true; config: SmsConfigRow; templateBody: string }
  | { ok: false; reason: 'migration' }
  | { ok: false; reason: 'error'; message: string }
> {
  let { data: config, error: configErr } = await sb
    .from('sms_config')
    .select('*')
    .eq('salon_id', salonId)
    .maybeSingle();

  if (configErr) {
    if (isSmsSchemaMissing(configErr)) return { ok: false, reason: 'migration' };
    return { ok: false, reason: 'error', message: configErr.message };
  }

  if (!config) {
    const admin = createAdminClient();
    const { data: inserted, error: insErr } = await admin
      .from('sms_config')
      .insert({ salon_id: salonId })
      .select('*')
      .single();
    if (insErr) {
      if (isSmsSchemaMissing(insErr)) return { ok: false, reason: 'migration' };
      return { ok: false, reason: 'error', message: insErr.message };
    }
    config = inserted;
  }

  let { data: template, error: tplErr } = await sb
    .from('sms_templates')
    .select('cuerpo')
    .eq('salon_id', salonId)
    .eq('clave', 'recordatorio_cita')
    .maybeSingle();

  if (tplErr) {
    if (isSmsSchemaMissing(tplErr)) return { ok: false, reason: 'migration' };
    return { ok: false, reason: 'error', message: tplErr.message };
  }

  if (!template) {
    const admin = createAdminClient();
    const { data: inserted, error: insErr } = await admin
      .from('sms_templates')
      .insert({
        salon_id: salonId,
        clave: 'recordatorio_cita',
        nombre: 'Recordatorio de cita',
        cuerpo: DEFAULT_TEMPLATE,
      })
      .select('cuerpo')
      .single();
    if (insErr) {
      if (isSmsSchemaMissing(insErr)) return { ok: false, reason: 'migration' };
      return { ok: false, reason: 'error', message: insErr.message };
    }
    template = inserted;
  }

  return {
    ok: true,
    config: config as SmsConfigRow,
    templateBody: template.cuerpo,
  };
}
