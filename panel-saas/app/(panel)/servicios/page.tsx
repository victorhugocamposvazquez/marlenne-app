import PanelShell from '@/components/shell/PanelShell';
import { INCIDENTS, SERVICES } from '@/lib/mock/panel-fixtures';

export default function ServiciosPage() {
  return (
    <PanelShell title="Estado de servicios" subtitle="Proveedores, métricas e incidentes">
      <div className="rounded-card bg-grad px-5 py-4 text-white">
        <p className="text-[14px] font-semibold opacity-90">Estado global</p>
        <p className="text-[20px] font-bold">Degradado · SMS con retrasos</p>
        <a href="#" className="mt-2 inline-block text-[13px] font-semibold underline opacity-90">Ver página pública de estado</a>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {SERVICES.map(s => (
          <div key={s.name} className="rounded-card bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-[16px] font-bold">{s.name}</h2>
                <p className="text-[13px] text-ink-2">{s.provider}</p>
              </div>
              <span className="text-[13px] font-semibold" style={{ color: s.color }}>{s.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {s.metrics.map(m => (
                <div key={m.label} className="rounded-[12px] bg-page p-2.5">
                  <p className="text-[11px] text-ink-3">{m.label}</p>
                  <p className="text-[14px] font-bold" style={{ color: m.color ?? '#0F0E1A' }}>{m.value}</p>
                </div>
              ))}
            </div>
            {s.note && <p className="mt-3 rounded-[12px] bg-[#FFF7E6] p-3 text-[13px] text-[#8A5A00]">{s.note}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" className="rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold">Comprobar ahora</button>
              <button type="button" className="rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold">Registro</button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card bg-white p-5">
        <h2 className="mb-3 text-[16px] font-bold">Incidentes (90 días)</h2>
        <ul className="divide-y divide-line">
          {INCIDENTS.map(i => (
            <li key={i.title} className="grid gap-2 py-3 sm:grid-cols-[72px_1fr_auto] sm:items-center">
              <span className="text-[13px] text-ink-3">{i.date}</span>
              <div className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-pill" style={{ background: i.color }} />
                <div>
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-[13px] text-ink-2">{i.impact}</p>
                </div>
              </div>
              <span className="text-[13px] font-semibold text-ink-2">{i.duration}</span>
            </li>
          ))}
        </ul>
      </div>
    </PanelShell>
  );
}
