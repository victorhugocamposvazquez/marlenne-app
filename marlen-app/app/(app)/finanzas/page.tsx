import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import {
  defaultFinanzasRange,
  loadFinanzasClients,
  loadFinanzasMovements,
} from '@/lib/finanzas';
import { fetchSalonEmisor } from '@/lib/salon-branding-load';
import FinanzasView from '@/components/finanzas/FinanzasView';

export default async function FinanzasPage() {
  const me = await requireRole('admin', 'reception');
  const sb = createClient();
  const range = defaultFinanzasRange();
  const [movs, clients, emisor] = await Promise.all([
    loadFinanzasMovements(sb, range),
    loadFinanzasClients(sb),
    fetchSalonEmisor(sb, me.salon_id),
  ]);

  return <FinanzasView initialMovs={movs} clients={clients} emisor={emisor} />;
}
