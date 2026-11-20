export const OFFLINE_SAVE = 'Sin conexión. No se ha guardado.';

/** En el navegador, corta la escritura antes de que la petición se quede colgada. */
export function refuseOffline(): { ok: false; error: string } | null {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: OFFLINE_SAVE };
  }
  return null;
}
