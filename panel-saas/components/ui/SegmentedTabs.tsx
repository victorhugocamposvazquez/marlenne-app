'use client';

export default function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-pill bg-white p-1">
      {tabs.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`shrink-0 rounded-pill px-4 py-2 text-[13px] font-semibold transition-colors ${
            active === t ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
