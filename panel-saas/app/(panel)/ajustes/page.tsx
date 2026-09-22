import PanelShell from '@/components/shell/PanelShell';
import AjustesSaasView from '@/components/ajustes/AjustesSaasView';

export default function AjustesPage() {
  return (
    <PanelShell title="Ajustes del SaaS" subtitle="Suscripciones, SMS, pagos e integraciones globales">
      <AjustesSaasView />
    </PanelShell>
  );
}
