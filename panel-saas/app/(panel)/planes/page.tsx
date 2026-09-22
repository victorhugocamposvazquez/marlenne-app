import PanelShell from '@/components/shell/PanelShell';
import { PLAN_CARDS, REFERRAL, SMS_BONUSES } from '@/lib/mock/panel-fixtures';

export default function PlanesPage() {
  return (
    <PanelShell title="Planes, bonos y referidos" subtitle="Catálogo de suscripción, márgenes SMS y captación">
      <div className="grid gap-3 lg:grid-cols-3">
        {PLAN_CARDS.map(p => (
          <div
            key={p.name}
            className={`rounded-card bg-white p-5 ${p.featured ? 'ring-2 ring-ink' : 'border border-transparent'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[18px] font-bold">{p.name}</h2>
                <p className="text-[26px] font-bold tracking-tight">{p.price} €<span className="text-[14px] font-semibold text-ink-2">/mes</span></p>
              </div>
              <button type="button" className="rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold">Editar</button>
            </div>
            <p className="mt-2 text-[13px] font-semibold text-ink-2">{p.count} · {p.mrr}</p>
            <ul className="mt-4 space-y-1.5 text-[14px] text-ink-2">
              {p.features.map(f => <li key={f}>· {f}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-card bg-white p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">Bonos de SMS</h2>
            <p className="text-[13px] text-ink-2">No caducan · se consumen tras el cupo del plan</p>
          </div>
          <button type="button" className="h-10 rounded-pill bg-ink px-4 text-[13px] font-semibold text-white">+ Nuevo bono</button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {SMS_BONUSES.map(b => (
            <div key={b.name} className="rounded-[14px] bg-page p-4">
              <p className="font-semibold">{b.name}</p>
              <p className="mt-1 text-[13px] text-ink-2">{b.unit} · margen {b.margin}</p>
              <p className="mt-2 text-[18px] font-bold">{b.price}</p>
              <p className="text-[12px] text-ink-3">{b.sold}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-card bg-white p-5 space-y-3">
          <h2 className="text-[16px] font-bold">Programa de referidos</h2>
          <p className="text-[14px]">Enlace: <span className="font-semibold text-brand-pink">{REFERRAL.link}</span></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] bg-page p-4">
              <p className="text-[12px] font-semibold text-ink-2">La referida recibe</p>
              <p className="mt-1 text-[16px] font-bold">{REFERRAL.referredDiscount}</p>
            </div>
            <div className="rounded-[14px] bg-page p-4">
              <p className="text-[12px] font-semibold text-ink-2">La referente recibe</p>
              <p className="mt-1 text-[16px] font-bold">{REFERRAL.referrerReward}</p>
              <p className="text-[12px] text-ink-3">al primer cobro de la referida</p>
            </div>
          </div>
          <p className="text-[13px] text-ink-2">Coste del programa: {REFERRAL.programCost}</p>
        </div>
        <div className="rounded-card bg-white p-5">
          <h2 className="mb-3 text-[16px] font-bold">Altas por origen (90 días)</h2>
          {REFERRAL.origins.map(o => (
            <div key={o.label} className="mb-3">
              <div className="mb-1 flex justify-between text-[14px]">
                <span>{o.label}</span>
                <span className="font-semibold">{o.pct} %</span>
              </div>
              <span className="block h-2 overflow-hidden rounded-pill bg-line">
                <span className="block h-full rounded-pill bg-grad" style={{ width: `${o.pct}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
