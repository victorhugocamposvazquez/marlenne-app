/** Remitente LabsMobile: hasta 11 alfanuméricos o 16 dígitos (con o sin +). */
export function normalizeSmsSender(raw: string): { ok: true; sender: string | null } | { ok: false; error: string } {
  let sender = raw.trim().replace(/[\s-]/g, '');
  if (!sender) return { ok: true, sender: null };
  if (sender.startsWith('+')) sender = sender.slice(1);
  const letters = /^[A-Za-z0-9]{1,11}$/.test(sender);
  const digits = /^\d{1,16}$/.test(sender);
  if (!letters && !digits) {
    return { ok: false, error: 'Remitente: hasta 11 letras o un número (máx. 16 dígitos), sin espacios' };
  }
  return { ok: true, sender };
}
