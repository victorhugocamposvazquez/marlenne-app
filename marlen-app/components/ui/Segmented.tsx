'use client';

export default function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  ariaLabel: string;
  size?: 'md' | 'sm';
}) {
  const compact = size === 'sm';
  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex gap-1 rounded-icon bg-track ${compact ? 'p-0.5' : 'p-1'}`}>
      {options.map(o => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.id)}
            className={`rounded-chip font-semibold transition motion-safe:active:scale-[.97] ${
              compact ? 'min-h-[36px] px-3 text-label' : 'min-h-[44px] px-5 text-body'
            } ${on ? 'bg-surface-card text-v-d shadow-seg' : 'text-ink-2'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
