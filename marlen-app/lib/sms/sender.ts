/** Remitente de un centro en LabsMobile: hasta 11 letras o 16 números, sin espacios. */
export function normalizeSmsSender(raw: string): { ok: true; sender: string | null } | { ok: false; error: string } {
  const sender = raw.trim();
  if (!sender) return { ok: true, sender: null };
  const letters = /^[A-Za-z0-9]{1,11}$/.test(sender);
  const digits = /^\d{1,16}$/.test(sender);
  if (!letters && !digits) {
    return { ok: false, error: 'El remitente son hasta 11 letras o 16 números, sin espacios' };
  }
  return { ok: true, sender };
}
