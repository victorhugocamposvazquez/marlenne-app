'use client';

import { MARKETING_STYLES } from '@/lib/marketing/styles';
import type { MarketingStyleId } from '@/lib/marketing/types';

export default function StylePicker({
  value,
  onChange,
}: {
  value: MarketingStyleId | null;
  onChange: (id: MarketingStyleId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 min-[640px]:grid-cols-3">
      {MARKETING_STYLES.map(s => {
        const on = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`overflow-hidden rounded-2xl border text-left transition ${
              on
                ? 'border-ink ring-2 ring-ink/20'
                : 'border-surface-line hover:border-ink/30'
            }`}
          >
            <div
              className="h-16 w-full"
              style={{ background: s.swatch }}
              aria-hidden
            />
            <div className="px-3 py-2.5">
              <div className="text-body font-bold text-ink">{s.name}</div>
              <div className="mt-0.5 text-caption leading-snug text-ink-2">{s.hint}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
