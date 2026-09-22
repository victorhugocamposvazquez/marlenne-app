import { notFound } from 'next/navigation';
import PanelShell from '@/components/shell/PanelShell';
import EmpresaFichaTabs from '@/components/empresas/EmpresaFichaTabs';
import { getCompany } from '@/lib/mock/companies';

export default function EmpresaPage({ params }: { params: { id: string } }) {
  const company = getCompany(Number(params.id));
  if (!company) notFound();

  return (
    <PanelShell
      title={company.name}
      subtitle={`${company.city} · ${company.pros} profesionales · cliente desde ${company.since}`}
      crumb={{ label: 'Empresas', href: '/empresas' }}
    >
      <EmpresaFichaTabs company={company} />
    </PanelShell>
  );
}
