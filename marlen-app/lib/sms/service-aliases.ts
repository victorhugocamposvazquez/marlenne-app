import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Emparejado entre el nombre de servicio del catálogo y el que se escribe en el SMS.
 */
export function normalizeServicioKey(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2012-\u2015\u2212]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nombre configurado para el cliente, o null si ese servicio no tiene alias. */
export function aliasServicio(
  nombre: string | null | undefined,
  alias: Record<string, string>,
): string | null {
  if (!nombre) return null;
  const propio = alias[normalizeServicioKey(nombre)];
  return propio?.trim() ? propio.trim() : null;
}

/** Alias de servicios configurados en el backoffice, por clave normalizada. */
export async function loadServiceAliases(salonId: string): Promise<Record<string, string>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('sms_service_aliases')
    .select('clave, nombre_sms')
    .eq('salon_id', salonId);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.nombre_sms?.trim()) out[row.clave] = row.nombre_sms.trim();
  }
  return out;
}
