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
import { salonHasVendorInvoices } from '@/lib/vendor-invoices-feature';
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
  const vendorToolsOn = await salonHasVendorInvoices(sb, me.salon_id);

  const [loaded, clients, emisor, connections, invoices, gestoria] = await Promise.all([
    loadFinanzasMovements(sb, { ...range, salonId: me.salon_id }),
    loadFinanzasClients(sb, me.salon_id),
    fetchSalonEmisor(sb, me.salon_id),
    vendorToolsOn ? loadVendorConnections(sb, me.salon_id) : Promise.resolve([]),
    vendorToolsOn ? loadVendorInvoices(sb, me.salon_id, periodKey) : Promise.resolve([]),
    vendorToolsOn ? loadGestoriaContacts(sb, me.salon_id) : Promise.resolve({ whatsapp: null }),
  ]);

  let allInvoices = invoices;
  if (vendorToolsOn) {
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
    allInvoices = [...invoices, ...extraLists.flat()];
  }

  return (
    <FinanzasView
      initialMovs={loaded.movs}
      clients={clients}
      emisor={emisor}
      loadWarning={loaded.warning}
      vendorToolsEnabled={vendorToolsOn}
      vendorConnections={connections}
      vendorInvoices={allInvoices}
      gestoriaWhatsapp={gestoria.whatsapp}
      amazonConfigured={amazonConfigured()}
      metaConfigured={metaConfigured()}
    />
  );
}
