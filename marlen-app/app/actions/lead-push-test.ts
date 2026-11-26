'use server';

import { requireRole } from '@/lib/require-session';
import { leadsDesk } from '@/lib/leads-desk';
import { notifyNewLead } from '@/lib/lead-push';

export async function testLeadPushNotification(
  kind: 'meta' | 'manual',
): Promise<{ ok: true; sent: number } | { ok: false; error: string }> {
  const { me, on } = await leadsDesk();
  if (!on) return { ok: false, error: 'Leads no está activado para este centro.' };

  await requireRole('admin', 'reception');

  const stamp = Date.now();
  const fromMeta = kind === 'meta';
  const { sent } = await notifyNewLead({
    salonId: me.salon_id,
    leadId: `test-${stamp}`,
    openUrl: '/leads',
    name: fromMeta ? 'Ana (prueba Meta)' : 'María (prueba manual)',
    phone: '+34600111222',
    campaign: fromMeta ? 'Campaña de prueba' : 'Alta manual',
    ad: fromMeta ? 'Anuncio de prueba' : null,
    fromMeta,
  });

  if (sent === 0) {
    return {
      ok: false,
      error: 'No ha salido a ningún móvil. En el iPhone: Marlén en inicio, permisos de avisos y activar push en Ajustes → Cuenta.',
    };
  }
  return { ok: true, sent };
}