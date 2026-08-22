import { dateLbl } from '@/lib/time';
import type { Measurement, TreatmentRow } from '@/lib/types';
import { Empty } from './Tabs';

/** Línea de evolución sin librerías: son pocos puntos y siempre en el mismo eje. */
function Spark({ values }: { values: number[] }) {
  const w = 240;
  const h = 44;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function MeasurementsTab({ treatments }: { treatments: TreatmentRow[] }) {
  const all = treatments.flatMap(t => t.measurements ?? []);
  if (!all.length) return <Empty>Aún no se ha registrado ninguna medida.</Empty>;

  const series = new Map<string, Measurement[]>();
  for (const m of all) {
    const list = series.get(m.metric) ?? [];
    list.push(m);
    series.set(m.metric, list);
  }
  for (const list of series.values()) {
    list.sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at));
  }

  return (
    <div className="flex flex-col gap-2.5">
      {[...series.entries()].map(([metric, list]) => {
        const nums = list.filter(m => m.value_num !== null).map(m => Number(m.value_num));
        const unit = list.find(m => m.unit)?.unit ?? '';
        const first = nums[0];
        const last = nums[nums.length - 1];
        const delta = nums.length > 1 ? last - first : null;

        return (
          <article key={metric} className="rounded-row border border-surface-line bg-white p-3.5 shadow-card">
            <div className="flex items-baseline gap-2">
              <h3 className="flex-1 text-[13px] font-bold uppercase tracking-[.02em] text-ink-2">{metric}</h3>
              {nums.length > 0 && (
                <span className="text-[19px] font-extrabold tabular-nums tracking-[-.02em]">
                  {last}
                  <span className="ml-0.5 text-[12px] font-bold text-ink-3">{unit}</span>
                </span>
              )}
              {delta !== null && delta !== 0 && (
                <span
                  className={`rounded-[9px] px-2 py-1 text-[11px] font-bold tabular-nums ${
                    delta < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-v-soft text-v-d'
                  }`}
                >
                  {delta > 0 ? '+' : ''}{Number(delta.toFixed(2))}{unit}
                </span>
              )}
            </div>

            {nums.length > 1 && (
              <>
                <Spark values={nums} />
                <div className="flex justify-between text-[10.5px] font-semibold text-ink-3">
                  <span>{dateLbl(list[0].measured_at)} · {first}{unit}</span>
                  <span>{dateLbl(list[list.length - 1].measured_at)}</span>
                </div>
              </>
            )}

            {list.some(m => m.value_text) && (
              <ul className="mt-2 flex flex-col gap-1">
                {list.filter(m => m.value_text).map(m => (
                  <li key={m.id} className="flex items-baseline gap-2 text-[12px] font-medium text-ink-2">
                    <span className="tabular-nums text-ink-3">{dateLbl(m.measured_at)}</span>
                    <span className="font-bold text-ink">{m.value_text}</span>
                    {m.session_no !== null && <span className="text-ink-3">sesión {m.session_no}</span>}
                  </li>
                ))}
              </ul>
            )}

            {nums.length === 1 && !list.some(m => m.value_text) && (
              <p className="mt-1.5 text-[11.5px] font-semibold text-ink-3">
                Solo hay una toma, del {dateLbl(list[0].measured_at)}. Con dos ya se ve la evolución.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
