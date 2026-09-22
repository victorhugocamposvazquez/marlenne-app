import { requireSession } from '@/lib/require-session';
import { getReadyStatus } from '@/lib/ready';
import AjustesIndex from '@/components/ajustes/AjustesIndex';

export default async function AjustesPage() {
  const me = await requireSession();
  const ready = me.role === 'admin' ? await getReadyStatus() : [];
  return (
    <AjustesIndex
      me={{ full_name: me.full_name, job_title: me.job_title, role: me.role }}
      ready={ready}
    />
  );
}