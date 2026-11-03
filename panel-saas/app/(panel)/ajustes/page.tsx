import PanelShell from '@/components/shell/PanelShell';
import AjustesSaasView from '@/components/ajustes/AjustesSaasView';
import BrevoUsageCard from '@/components/email/BrevoUsageCard';
import { loadBrevoUsage } from '@/lib/brevo-usage';

export default async function AjustesPage() {
  const brevo = await loadBrevoUsage();
  return (
    <PanelShell title="Ajustes del SaaS" subtitle="Suscripciones, SMS, pagos e integraciones globales">
      <BrevoUsageCard usage={brevo} />
      <AjustesSaasView />
    </PanelShell>
  );
}
