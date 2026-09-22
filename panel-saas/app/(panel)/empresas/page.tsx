import PanelShell from '@/components/shell/PanelShell';
import EmpresasTable from '@/components/empresas/EmpresasTable';
import { eur } from '@/lib/format';
import { COMPANIES, MRR } from '@/lib/mock/companies';

export default function EmpresasPage() {
  const active = COMPANIES.filter(c => c.status === 'Activa').length;
  const subtitle = `${COMPANIES.length.toLocaleString('es-ES')} empresas · ${active.toLocaleString('es-ES')} activas · ${eur(MRR)}/mes`;

  return (
    <PanelShell title="Empresas" subtitle={subtitle}>
      <EmpresasTable companies={COMPANIES} />
    </PanelShell>
  );
}
