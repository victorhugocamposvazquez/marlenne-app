'use client';

import { useRef } from 'react';
import { FileUp } from 'lucide-react';

/** Selector de CSV sin el «Nada seleccionado» nativo del navegador. */
export default function CsvFileField({
  label,
  file,
  optional,
  onChange,
}: {
  label: string;
  file: File | null;
  optional?: boolean;
  onChange: (file: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className={optional ? 'mt-2' : 'mt-3'}>
      <span className="mb-1 block text-caption font-bold uppercase text-ink-2">
        {label}
        {optional && <span className="font-semibold normal-case text-ink-3"> · opcional</span>}
      </span>
      <input
        ref={ref}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        onChange={e => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-field border border-surface-line bg-surface-bg px-3 text-left"
        >
          <FileUp size={18} strokeWidth={2} className="shrink-0 text-ink-3" aria-hidden />
          <span className={`min-w-0 flex-1 truncate text-body font-medium ${file ? 'text-ink' : 'text-ink-3'}`}>
            {file ? file.name : 'Elegir CSV…'}
          </span>
        </button>
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-field border border-surface-line bg-surface-bg px-3 text-caption font-bold text-ink-3"
          >
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}
