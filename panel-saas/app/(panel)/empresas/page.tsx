import PanelShell from '@/components/shell/PanelShell';
import EmpresasTable from '@/components/empresas/EmpresasTable';
import LiveEmpresaStrip from '@/components/empresas/LiveEmpresaStrip';
import { eur } from '@/lib/format';
import { loadLiveCenter } from '@/lib/live-center';
import { loadCompanyLeadsFlags } from '@/lib/leads-ops';
import LeadsOpsCard from '@/components/empresas/LeadsOpsCard';
import { COMPANIES, MRR } from '@/lib/mock/companies';

export default async function EmpresasPage() {
  const [live, leads] = await Promise.all([
    loadLiveCenter(),
    loadCompanyLeadsFlags(),
  ]);
  const active = COMPANIES.filter(c => c.status === 'Activa').length;
  const subtitle = `${COMPANIES.length.toLocaleString('es-ES')} en catálogo · 1 en producción · ${eur(MRR)}/mes (muestra)`;

  return (
    <PanelShell title="Empresas" subtitle={subtitle}>
      <LiveEmpresaStrip center={live} />
      <LeadsOpsCard flags={leads} />
      <p className="text-[13px] font-semibold text-ink-3">Muestra</p>
      <EmpresasTable companies={COMPANIES} />
    </PanelShell>
  );
}
