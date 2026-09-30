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
  const [loaded, clients, emisor] = await Promise.all([
    loadFinanzasMovements(sb, { ...range, salonId: me.salon_id }),
    loadFinanzasClients(sb, me.salon_id),
    fetchSalonEmisor(sb, me.salon_id),
  ]);

  return (
    <FinanzasView
      initialMovs={loaded.movs}
      clients={clients}
      emisor={emisor}
      loadWarning={loaded.warning}
    />
  );
}
