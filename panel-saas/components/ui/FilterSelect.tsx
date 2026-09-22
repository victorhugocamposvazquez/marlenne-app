'use client';

import { ChevronDown } from 'lucide-react';

export default function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const active = value !== options[0];
  const display = active ? value : label;

  return (
    <div className={`relative flex h-11 shrink-0 items-center rounded-[14px] border-[1.5px] bg-white py-0 pl-3.5 pr-9 ${active ? 'border-ink' : 'border-line'}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 w-full cursor-pointer opacity-0"
      >
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <span className="pointer-events-none text-[13px] font-semibold text-ink">{display}</span>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 text-ink-2" />
    </div>
  );
}
