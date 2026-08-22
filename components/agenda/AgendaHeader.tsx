'use client';

import { useRouter } from 'next/navigation';
import { Ban, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { dayTitle } from '@/lib/time';
import type { Provider } from '@/lib/types';

export default function AgendaHeader({
  day, mode, label, waiting, providers = [], selectedPro, canFilter,
}: {
  day: number;
  mode: 'dia' | 'semana';
  label: string;
  waiting: number;
  providers?: Provider[];
  selectedPro?: string | null;
  canFilter?: boolean;
}) {
  const router = useRouter();
  const go = (d: number, m: string, extra?: Record<string, string>) => {
    const q = new URLSearchParams();
    q.set('day', String(d));
    q.set('mode', m);
    if (selectedPro) q.set('pro', selectedPro);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v) q.set(k, v);
        else q.delete(k);
      }
    }
    router.push(`/agenda?${q.toString()}`);
  };

  const seg = (active: boolean) =>
    `rounded-[11px] px-5 py-[7px] text-[13px] font-semibold transition ${
      active ? 'bg-white text-v-d shadow-seg' : 'text-ink-2'
    }`;

  return (
    <header className="shrink-0 px-5 pb-3 pt-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-v">{label}</div>
          <h1 className="mt-0.5 text-[23px] font-extrabold leading-[1.15] tracking-[-.025em]">
            {mode === 'semana' ? 'Esta semana' : dayTitle(day)}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => go(day - 1, mode)} aria-label="Anterior"
            className="grid h-[38px] w-[38px] place-items-center rounded-[13px] border border-surface-line bg-white shadow-card hover:bg-v-tint">
            <ChevronLeft size={17} strokeWidth={2.2} />
          </button>
          <button onClick={() => go(day + 1, mode)} aria-label="Siguiente"
            className="grid h-[38px] w-[38px] place-items-center rounded-[13px] border border-surface-line bg-white shadow-card hover:bg-v-tint">
            <ChevronRight size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {canFilter && providers.length > 1 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto">
          <FilterChip
            active={!selectedPro}
            onClick={() => go(day, mode, { pro: '' })}
          >
            Todas
          </FilterChip>
          {providers.map(p => (
            <FilterChip
              key={p.id}
              active={selectedPro === p.id}
              onClick={() => go(day, mode, { pro: p.id })}
            >
              {p.full_name.split(' ')[0]}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="mt-3.5 flex items-center gap-2.5">
        <div className="flex gap-1 rounded-[14px] bg-track p-1">
          <button className={seg(mode === 'dia')} onClick={() => go(day, 'dia')}>Día</button>
          <button className={seg(mode === 'semana')} onClick={() => go(day, 'semana')}>Semana</button>
        </div>
        <button
          onClick={() => go(day, mode, { block: '1' })}
          aria-label="Bloquear hueco"
          className="ml-auto grid h-[38px] w-[38px] place-items-center rounded-[13px] border border-surface-line bg-white shadow-card"
        >
          <Ban size={15} className="text-ink-2" strokeWidth={2.2} />
        </button>
        <button
          onClick={() => go(day, mode, { wait: '1' })}
          className="flex items-center gap-[7px] rounded-[13px] border border-surface-line bg-white px-3 py-2 text-[12.5px] font-bold shadow-card"
        >
          <Clock size={15} className="text-v" strokeWidth={2.2} />
          Espera
          <span className="rounded-lg bg-v-soft px-1.5 text-[11px] text-v-d">{waiting}</span>
        </button>
      </div>
    </header>
  );
}

function FilterChip({
  active, children, onClick,
}: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-chip px-3 py-1.5 text-[12px] font-bold ${
        active ? 'bg-grad text-white shadow-pill' : 'border border-surface-line bg-white text-ink-2'
      }`}
    >
      {children}
    </button>
  );
}
