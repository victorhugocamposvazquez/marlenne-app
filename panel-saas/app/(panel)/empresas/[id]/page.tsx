import Link from 'next/link';
import { notFound } from 'next/navigation';
import PanelShell from '@/components/shell/PanelShell';
import StatusPill from '@/components/ui/StatusPill';
import { eur, initials } from '@/lib/format';
import { getCompany } from '@/lib/mock/companies';

export default function EmpresaPage({ params }: { params: { id: string } }) {
  const company = getCompany(Number(params.id));
  if (!company) notFound();

  const pct = company.smsTotal ? Math.round((company.smsLeft / company.smsTotal) * 100) : 0;

  return (
    <PanelShell
      title={company.name}
      subtitle={`${company.city} · ${company.pros} profesionales · cliente desde ${company.since}`}
      crumb={{ label: 'Empresas', href: '/empresas' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-[14px] text-[14px] font-bold text-white" style={{ background: company.avatar }}>
            {initials(company.name)}
          </span>
          <div>
            <p className="text-[13px] text-ink-3">#{company.id}</p>
            <StatusPill status={company.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="h-11 rounded-pill bg-ink px-4 text-[13px] font-semibold text-white">Entrar en su app (soporte)</button>
          <button type="button" className="h-11 rounded-pill border-[1.5px] border-line bg-white px-4 text-[13px] font-semibold">+ Bono de SMS</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-pill bg-white p-1">
        {['Resumen', 'SMS', 'Pagos', 'Su equipo', 'Ajustes'].map((t, i) => (
          <button key={t} type="button" className={`shrink-0 rounded-pill px-4 py-2 text-[13px] font-semibold ${i === 0 ? 'bg-ink text-white' : 'text-ink-2'}`}>{t}</button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-card bg-white p-5 space-y-3">
          <h2 className="text-[16px] font-bold">Suscripción</h2>
          <p className="text-[14px]"><span className="font-semibold">{company.plan}</span> · {eur(company.price)}/mes</p>
          <p className="text-[13px] text-ink-2">Próximo cobro: {company.next}</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold">Cambiar plan</button>
            <button type="button" className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold">Pausar</button>
          </div>
        </div>
        <div className="rounded-card bg-white p-5 space-y-3">
          <h2 className="text-[16px] font-bold">SMS</h2>
          <p className="text-[14px] font-semibold">{company.smsLeft} restantes de {company.smsTotal}</p>
          <span className="block h-2 overflow-hidden rounded-pill bg-line"><span className="block h-full rounded-pill bg-brand-pink" style={{ width: `${pct}%` }} /></span>
          <p className="text-[13px] text-ink-2">Al agotar cupo se cortan envíos hasta bono o renovación.</p>
        </div>
        <div className="rounded-card bg-white p-5 space-y-2 lg:col-span-2">
          <h2 className="text-[16px] font-bold">Contacto</h2>
          <p className="text-[14px]">{company.contact}</p>
          <p className="text-[14px] text-ink-2">{company.email} · {company.phone}</p>
          <Link href="#" className="text-[13px] font-semibold text-brand-pink">Ver en Stripe ({company.stripe})</Link>
        </div>
      </div>
    </PanelShell>
  );
}
