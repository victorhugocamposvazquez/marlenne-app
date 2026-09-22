import PanelShell from '@/components/shell/PanelShell';
import FinanzasView from '@/components/finanzas/FinanzasView';

export default function FinanzasPage() {
  return (
    <PanelShell title="Finanzas" subtitle="Ingresos frente a gastos · septiembre 2026">
      <FinanzasView />
    </PanelShell>
  );
}
