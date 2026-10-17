import AjustesHeader from '@/components/ajustes/AjustesHeader';
import CentroBrandingForm from '@/components/ajustes/CentroBrandingForm';
import { loadSalonBranding } from '@/app/actions/salon-branding';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { salonHasVendorInvoices } from '@/lib/vendor-invoices-feature';

export default async function AjustesCentroPage() {
  const me = await requireRole('admin');
  const sb = createClient();
  const [branding, vendorToolsOn] = await Promise.all([
    loadSalonBranding(),
    salonHasVendorInvoices(sb, me.salon_id),
  ]);

  return (
    <AjustesHeader title="Centro">
      <p className="mb-2 text-body leading-snug text-ink-2">
        Nombre, logo y datos fiscales del emisor. Se usan en facturas y en la app.
      </p>
      <CentroBrandingForm
        initial={branding}
        salonId={me.salon_id}
        showGestoria={vendorToolsOn}
      />
    </AjustesHeader>
  );
}
