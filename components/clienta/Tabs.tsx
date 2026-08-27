'use client';

import EmptyState from '@/components/ui/EmptyState';

const TABS = [
  { id: 'tratamientos', label: 'Tratamientos' },
  { id: 'medidas', label: 'Medidas' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'historial', label: 'Historial' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export function parseTab(value?: string | null): TabId {
  return TABS.some(t => t.id === value) ? (value as TabId) : 'tratamientos';
}

export default function Tabs({
  active, counts, onSelect,
}: {
  active: TabId;
  counts: Partial<Record<TabId, number>>;
  onSelect: (id: TabId) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-icon bg-track p-1">
      {TABS.map(t => {
        const on = t.id === active;
        const n = counts[t.id];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-current={on ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-chip px-3.5 py-[7px] text-label font-semibold transition ${
              on ? 'bg-surface-card text-v-d shadow-seg' : 'text-ink-2'
            }`}
          >
            {t.label}
            {n ? (
              <span className={`rounded-lg px-1.5 text-micro ${on ? 'bg-v-soft text-v-d' : 'bg-surface-card/70 text-ink-3'}`}>
                {n}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <EmptyState title={children} />;
}
