import { requireSession } from '@/lib/require-session';
import { getReadyStatus } from '@/lib/ready';
import AjustesIndex from '@/components/ajustes/AjustesIndex';
import PersonalAjustesShell from '@/components/ajustes/PersonalAjustesShell';

export default async function AjustesPage() {
  const me = await requireSession();
  const ready = me.role === 'admin' ? await getReadyStatus() : [];
  const props = {
    me: { full_name: me.full_name, job_title: me.job_title, role: me.role },
    ready,
    personal: me.workspace === 'personal',
  };
  if (me.workspace === 'personal') {
    const first = me.full_name.trim().split(/\s+/)[0] ?? me.full_name;
    return <PersonalAjustesShell {...props} greeting={`Hola ${first}`} />;
  }
  return <AjustesIndex {...props} />;
}