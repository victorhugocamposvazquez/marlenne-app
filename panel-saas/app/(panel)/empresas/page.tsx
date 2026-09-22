import PanelShell from '@/components/shell/PanelShell';
import EmpresasTable from '@/components/empresas/EmpresasTable';
import { COMPANIES } from '@/lib/mock/companies';

export default function EmpresasPage() {
  return (
    <PanelShell title="Empresas" subtitle={`${COMPANIES.length.toLocaleString('es-ES')} empresas en la plataforma`}>
      <EmpresasTable companies={COMPANIES} />
    </PanelShell>
  );
}
