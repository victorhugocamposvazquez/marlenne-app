import Link from 'next/link';
import { Plus } from 'lucide-react';
import PanelShell from '@/components/shell/PanelShell';
import { eur, fmt } from '@/lib/format';
import { attentionItems, COMPANIES, MRR } from '@/lib/mock/companies';

export default function DashboardPage() {
  const active = COMPANIES.filter(c => c.status === 'Activa').length;
  const impago = COMPANIES.filter(c => c.status === 'Impago').length;
  const attn = attentionItems();

  return (
    <PanelShell
      title="Buenos días, Marta"
      subtitle={`Lunes 21 de septiembre · ${attn.length} cosas requieren atención`}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="lg:hidden" />
        <button type="button" className="inline-flex h-11 items-center gap-2 rounded-pill bg-grad px-4 text-[14px] font-bold text-white shadow-brand">
          <Plus size={16} /> Alta de empresa
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Empresas activas', value: fmt(active), delta: '+12 este mes', deltaColor: 'text-ok' },
          { label: 'Ingresos mensuales', value: eur(MRR), delta: '+3,2 % vs ago', deltaColor: 'text-ok' },
          { label: 'SMS enviados hoy', value: '4.820', delta: '98,2 % entregados', deltaColor: 'text-ink-2' },
          { label: 'Impagos', value: String(impago), delta: 'Requieren acción', deltaColor: 'text-danger' },
        ].map(k => (
          <div key={k.label} className="rounded-card bg-white p-5">
            <p className="text-[13px] font-semibold text-ink-2">{k.label}</p>
            <p className="mt-2 text-[26px] font-bold tracking-tight">{k.value}</p>
            <p className={`mt-2 text-[12px] font-semibold ${k.deltaColor}`}>{k.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-card bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[16px] font-bold">Requiere atención</h2>
            <span className="text-[12px] text-ink-3">ordenado por dinero en juego</span>
          </div>
          <ul className="divide-y divide-line">
            {attn.map(a => (
              <li key={`${a.id}-${a.title}`}>
                <Link href={`/empresas/${a.id}`} className="flex items-center gap-3 py-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ background: a.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{a.title}</p>
                    <p className="text-[13px] text-ink-2">{a.sub}</p>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold text-brand-pink">{a.action}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="rounded-card bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-bold">Ingresos mensuales</h2>
              <Link href="/pagos" className="text-[13px] font-semibold text-brand-pink">Pagos</Link>
            </div>
            <div className="flex h-20 items-end gap-1">
              {[42, 48, 45, 52, 50, 55, 58, 54, 60, 62, 59, 64].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="w-full rounded-t bg-grad" style={{ height: `${h}%` }} />
                  <span className="text-[10px] text-ink-3">{['e', 'f', 'm', 'a', 'm', 'j', 'j', 'a', 's', 'o', 'n', 'd'][i]}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-ink-2">Básico 27 % · Pro 55 % · Premium 18 % · {eur(Math.round(MRR / active))}/empresa al mes</p>
          </div>
          <div className="rounded-card bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-bold">Servicios</h2>
              <Link href="/servicios" className="text-[13px] font-semibold text-brand-pink">Ver detalle</Link>
            </div>
            {[
              { name: 'SMS LabsMobile', metric: 'p95 1,2 s', label: 'Operativo', color: '#22C55E' },
              { name: 'Stripe', metric: '99,9 %', label: 'Operativo', color: '#22C55E' },
              { name: 'API / BD', metric: '12 ms', label: 'Operativo', color: '#22C55E' },
              { name: 'Colas SMS', metric: '234 en cola', label: 'Degradado', color: '#F59E0B' },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-2.5 py-1.5 text-[14px]">
                <span className="h-2 w-2 rounded-pill" style={{ background: s.color }} />
                <span className="flex-1">{s.name}</span>
                <span className="text-[12px] text-ink-3">{s.metric}</span>
                <span className="w-20 text-right text-[13px] font-semibold" style={{ color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
