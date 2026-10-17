import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import {
  defaultFinanzasRange,
  loadFinanzasClients,
  loadFinanzasMovements,
} from '@/lib/finanzas';
import { fetchSalonEmisor } from '@/lib/salon-branding-load';
import { amazonConfigured } from '@/lib/amazon-business';
import { metaConfigured } from '@/lib/meta-business-invoices';
import {
  loadGestoriaContacts,
  loadVendorConnections,
  loadVendorInvoices,
} from '@/lib/vendor-invoices-load';
import { currentPeriodKey } from '@/lib/vendor-invoices';
import FinanzasView from '@/components/finanzas/FinanzasView';

export default async function FinanzasPage() {
  const me = await requireRole('admin', 'reception');
  const sb = createClient();
  const range = defaultFinanzasRange();
  const periodKey = currentPeriodKey();
  const [loaded, clients, emisor, connections, invoices, gestoria] = await Promise.all([
    loadFinanzasMovements(sb, { ...range, salonId: me.salon_id }),
    loadFinanzasClients(sb, me.salon_id),
    fetchSalonEmisor(sb, me.salon_id),
    loadVendorConnections(sb, me.salon_id),
    loadVendorInvoices(sb, me.salon_id, periodKey),
    loadGestoriaContacts(sb, me.salon_id),
  ]);

  // Cargar también trimestres adyacentes para que al cambiar T en UI no quede vacío hasta refresh
  const { year } = (() => {
    const m = /^(\d{4})-T([1-4])$/.exec(periodKey);
    return { year: m ? Number(m[1]) : new Date().getFullYear() };
  })();
  const extraKeys = [1, 2, 3, 4]
    .map(q => `${year}-T${q}`)
    .filter(k => k !== periodKey);
  const extraLists = await Promise.all(
    extraKeys.map(k => loadVendorInvoices(sb, me.salon_id, k)),
  );
  const allInvoices = [...invoices, ...extraLists.flat()];

  return (
    <FinanzasView
      initialMovs={loaded.movs}
      clients={clients}
      emisor={emisor}
      loadWarning={loaded.warning}
      vendorConnections={connections}
      vendorInvoices={allInvoices}
      gestoriaWhatsapp={gestoria.whatsapp}
      amazonConfigured={amazonConfigured()}
      metaConfigured={metaConfigured()}
    />
  );
}
