import PanelShell from '@/components/shell/PanelShell';
import KpiGrid from '@/components/ui/KpiGrid';
import { SMS_FAILURES, SMS_KPIS, SMS_QUEUE } from '@/lib/mock/panel-fixtures';

export default function SmsPage() {
  const daily = [820, 910, 880, 950, 1020, 980, 1100, 1050, 1120, 1080, 1150, 1200, 1180, 1220];

  return (
    <PanelShell title="SMS" subtitle="Envíos, cola, costes y proveedor">
      <KpiGrid items={SMS_KPIS} />

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-card bg-white p-5">
          <h2 className="mb-3 text-[16px] font-bold">Entregados vs fallidos (14 días)</h2>
          <div className="flex h-28 items-end gap-1">
            {daily.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="w-full rounded-t bg-ok" style={{ height: `${Math.round(v / 12.2)}%` }} />
                <span className="w-full rounded-t bg-danger/30" style={{ height: `${4 + (i % 3)}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card bg-white p-5">
          <h2 className="mb-3 text-[16px] font-bold">Motivos de fallo</h2>
          <ul className="space-y-3">
            {SMS_FAILURES.map(f => (
              <li key={f.reason}>
                <div className="flex justify-between text-[14px]">
                  <span>{f.reason}</span>
                  <span className="font-semibold">{f.count.toLocaleString('es-ES')}</span>
                </div>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-pill bg-line">
                  <span className="block h-full rounded-pill bg-danger" style={{ width: `${f.pct}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-card bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold">Cola en tiempo real</h2>
          <div className="flex gap-2">
            <button type="button" className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold">Reintentar fallidos</button>
            <button type="button" className="rounded-pill bg-ink px-3 py-1.5 text-[13px] font-semibold text-white">Pasar al respaldo</button>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {SMS_QUEUE.map(q => (
            <div key={q.label} className="rounded-[14px] bg-page p-4">
              <dt className="text-[12px] font-semibold text-ink-2">{q.label}</dt>
              <dd className="mt-1 text-[16px] font-bold">{q.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </PanelShell>
  );
}
