/** Secreto compartido panel ↔ app para firmar entradas de soporte. */
export function opsSupportSecret(): string {
  const dedicated = process.env.OPS_SUPPORT_SECRET?.trim();
  if (dedicated) return dedicated;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (key) return key;
  throw new Error('Falta OPS_SUPPORT_SECRET o SUPABASE_SERVICE_ROLE_KEY');
}
