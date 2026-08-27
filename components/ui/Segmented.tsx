'use client';

export default function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1 rounded-icon bg-track p-1">
      {options.map(o => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.id)}
            className={`min-h-[44px] rounded-chip px-5 text-body font-semibold transition motion-safe:active:scale-[.97] ${
              on ? 'bg-surface-card text-v-d shadow-seg' : 'text-ink-2'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
