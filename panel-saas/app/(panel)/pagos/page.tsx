import PanelShell from '@/components/shell/PanelShell';
import KpiGrid from '@/components/ui/KpiGrid';
import { DUNNING, PAY_KPIS, PAY_MOVEMENTS } from '@/lib/mock/panel-fixtures';

const STATUS_COLOR = { Pagado: 'text-ok', Fallido: 'text-danger', Reembolsado: 'text-ink-3', Pendiente: 'text-trial' } as const;

export default function PagosPage() {
  return (
    <PanelShell title="Pagos" subtitle="Cobros, impagos, bonos y Stripe">
      <KpiGrid items={PAY_KPIS} />

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-card bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-bold">Movimientos recientes</h2>
            <div className="flex gap-1 rounded-pill bg-page p-1 text-[12px] font-semibold">
              {['Todos', 'Pagados', 'Fallidos', 'Bonos'].map((f, i) => (
                <span key={f} className={`rounded-pill px-3 py-1 ${i === 0 ? 'bg-ink text-white' : 'text-ink-2'}`}>{f}</span>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-line">
            {PAY_MOVEMENTS.map(m => (
              <li key={`${m.when}-${m.company}`} className="grid grid-cols-[56px_1fr_auto] gap-3 py-3 text-[14px] sm:grid-cols-[72px_1fr_1fr_auto_auto]">
                <span className="text-ink-3">{m.when}</span>
                <span className="font-semibold">{m.company}</span>
                <span className="hidden text-ink-2 sm:block">{m.detail}</span>
                <span className="font-semibold">{m.amount}</span>
                <span className={`font-semibold ${STATUS_COLOR[m.status]}`}>{m.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="rounded-card bg-white p-5">
            <h2 className="mb-3 text-[16px] font-bold">Embudo de recuperación de impagos</h2>
            <ul className="space-y-3">
              {DUNNING.map(d => (
                <li key={d.day} className="flex gap-3 rounded-[14px] bg-page p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-ink text-[12px] font-bold text-white">D{d.day}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{d.label}</p>
                    <p className="text-[13px] text-brand-pink">{d.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card bg-white p-5">
            <h2 className="text-[16px] font-bold">Stripe</h2>
            <p className="mt-2 text-[14px] text-ink-2">Cuenta producción · webhooks operativos · último evento hace 2 min</p>
            <button type="button" className="mt-3 rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold">Abrir dashboard Stripe</button>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
