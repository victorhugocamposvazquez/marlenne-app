import { cache } from 'react';
import { requireRole } from '@/lib/require-session';
import { leadsEnabled } from '@/lib/leads-enabled';

/** Una sola comprobación de rol y feature por petición de Leads. */
export const leadsDesk = cache(async () => {
  const me = await requireRole('admin', 'reception');
  const on = await leadsEnabled(me.salon_id);
  return { me, on };
});