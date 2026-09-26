import { notFound } from 'next/navigation';
import PanelShell from '@/components/shell/PanelShell';
import EmpresaFichaTabs from '@/components/empresas/EmpresaFichaTabs';
import { getCompany } from '@/lib/mock/companies';
import { loadLiveCenter, loadLiveStaff } from '@/lib/live-center';
import { loadOpsSupportAudit } from '@/lib/ops-support-audit';

export default async function EmpresaPage({ params }: { params: { id: string } }) {
  const company = getCompany(Number(params.id));
  if (!company) notFound();
  const live = company.live ? await loadLiveCenter() : null;
  const liveStaff = live ? await loadLiveStaff(live.salonId) : [];
  const opsAudit = live ? await loadOpsSupportAudit(live.salonId) : [];

  return (
    <PanelShell
      title={company.name}
      subtitle={company.live
        ? 'En producción · los SMS automáticos siguen en prueba'
        : `${company.city} · ${company.pros} profesionales · cliente desde ${company.since}`}
      crumb={{ label: 'Empresas', href: '/empresas' }}
    >
      <EmpresaFichaTabs company={company} live={live} liveStaff={liveStaff} opsAudit={opsAudit} />
    </PanelShell>
  );
}
