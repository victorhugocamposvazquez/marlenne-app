import Link from 'next/link';

const TABS = [
  { id: 'tratamientos', label: 'Tratamientos' },
  { id: 'medidas', label: 'Medidas' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'historial', label: 'Historial' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export function parseTab(value?: string): TabId {
  return TABS.some(t => t.id === value) ? (value as TabId) : 'tratamientos';
}

export default function Tabs({
  base, active, counts,
}: {
  base: string;
  active: TabId;
  counts: Partial<Record<TabId, number>>;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-[14px] bg-track p-1">
      {TABS.map(t => {
        const on = t.id === active;
        const n = counts[t.id];
        return (
          <Link
            key={t.id}
            href={`${base}?tab=${t.id}`}
            scroll={false}
            aria-current={on ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-[11px] px-3.5 py-[7px] text-[12.5px] font-semibold transition ${
              on ? 'bg-white text-v-d shadow-seg' : 'text-ink-2'
            }`}
          >
            {t.label}
            {n ? (
              <span className={`rounded-lg px-1.5 text-[10.5px] ${on ? 'bg-v-soft text-v-d' : 'bg-white/70 text-ink-3'}`}>
                {n}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-row border border-dashed border-handle bg-white/60 px-4 py-8 text-center text-[13px] font-semibold text-ink-3">
      {children}
    </p>
  );
}
