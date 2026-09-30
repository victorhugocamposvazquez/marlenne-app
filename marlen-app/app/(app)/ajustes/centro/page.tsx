import AjustesHeader from '@/components/ajustes/AjustesHeader';
import CentroBrandingForm from '@/components/ajustes/CentroBrandingForm';
import { loadSalonBranding } from '@/app/actions/salon-branding';
import { requireRole } from '@/lib/require-session';

export default async function AjustesCentroPage() {
  const me = await requireRole('admin');
  const branding = await loadSalonBranding();

  return (
    <AjustesHeader title="Centro">
      <p className="mb-2 text-body leading-snug text-ink-2">
        Nombre, logo y datos fiscales del emisor. Se usan en facturas y en la app.
      </p>
      <CentroBrandingForm initial={branding} salonId={me.salon_id} />
    </AjustesHeader>
  );
}
