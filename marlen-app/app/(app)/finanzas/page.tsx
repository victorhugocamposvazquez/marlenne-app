import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import {
  defaultFinanzasRange,
  loadFinanzasClients,
  loadFinanzasMovements,
} from '@/lib/finanzas';
import FinanzasView from '@/components/finanzas/FinanzasView';

export default async function FinanzasPage() {
  await requireRole('admin', 'reception');
  const sb = createClient();
  const range = defaultFinanzasRange();
  const [movs, clients] = await Promise.all([
    loadFinanzasMovements(sb, range),
    loadFinanzasClients(sb),
  ]);

  return <FinanzasView initialMovs={movs} clients={clients} />;
}
