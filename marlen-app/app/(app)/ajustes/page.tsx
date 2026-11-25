import { requireSession } from '@/lib/require-session';
import { getReadyStatus } from '@/lib/ready';
import { leadsEnabled } from '@/lib/leads-enabled';
import { metaConnectStatus } from '@/app/actions/meta-connect';
import AjustesIndex from '@/components/ajustes/AjustesIndex';

export default async function AjustesPage() {
  const me = await requireSession();
  const ready = me.role === 'admin' ? await getReadyStatus() : [];
  const leadsOn = me.role === 'admin' && await leadsEnabled(me.salon_id);
  const leadsStatus = leadsOn ? await metaConnectStatus() : null;
  const leads = leadsStatus
    ? { hint: leadsStatus.pageName?.trim() || 'Faltan los anuncios' }
    : null;
  return (
    <AjustesIndex
      me={{ full_name: me.full_name, job_title: me.job_title, role: me.role }}
      ready={ready}
      leads={leads}
    />
  );
}
