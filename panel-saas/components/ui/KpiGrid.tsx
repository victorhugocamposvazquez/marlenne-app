export type KpiItem = {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaColor?: string;
  color?: string;
};

export default function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="rounded-card bg-white p-5">
          <p className="text-[13px] font-semibold text-ink-2">{k.label}</p>
          <p className="mt-2 whitespace-nowrap text-[26px] font-bold tracking-tight" style={{ color: k.color ?? '#0F0E1A' }}>
            {k.value}
          </p>
          {k.sub && <p className="mt-2 text-[12px] text-ink-2">{k.sub}</p>}
          {k.delta && <p className={`mt-1 text-[12px] font-semibold ${k.deltaColor ?? 'text-ink-2'}`}>{k.delta}</p>}
        </div>
      ))}
    </div>
  );
}
