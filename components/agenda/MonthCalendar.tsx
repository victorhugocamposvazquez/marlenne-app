'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateFromOffset, dayKey, offsetFromDay, skipSunday } from '@/lib/time';

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function MonthCalendar({
  selectedOffset,
  busyKeys = [],
  onClose,
  onSelect,
}: {
  selectedOffset: number;
  busyKeys?: string[];
  onClose: () => void;
  onSelect: (offset: number) => void;
}) {
  const selectedKey = dayKey(dateFromOffset(selectedOffset));
  const [month, setMonth] = useState(() => selectedKey.slice(0, 7));
  const busy = useMemo(() => new Set(busyKeys), [busyKeys]);

  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const pad = (first.getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const title = first.toLocaleDateString('es-ES', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  const todayKey = dayKey(dateFromOffset(0));

  const cells: { n: number | null; key?: string; sun?: boolean }[] = [
    ...Array.from({ length: pad }, () => ({ n: null })),
    ...Array.from({ length: daysIn }, (_, i) => {
      const n = i + 1;
      const key = `${y}-${String(m).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      const sun = new Date(Date.UTC(y, m - 1, n)).getUTCDay() === 0;
      return { n, key, sun };
    }),
  ];

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button type="button" aria-label="Cerrar calendario" className="absolute inset-0 bg-[rgba(15,14,26,.35)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[440px] rounded-t-sheet bg-white px-6 pb-8 pt-3 shadow-[0_-20px_60px_rgba(15,14,26,.18)]">
        <div className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-handle" />
        <div className="mb-4 flex items-center justify-between">
          <button type="button" aria-label="Mes anterior" onClick={() => shiftMonth(-1)} className="grid h-10 w-10 place-items-center rounded-pill bg-track">
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>
          <p className="text-[18px] font-bold capitalize">{title}</p>
          <button type="button" aria-label="Mes siguiente" onClick={() => shiftMonth(1)} className="grid h-10 w-10 place-items-center rounded-pill bg-track">
            <ChevronRight size={16} strokeWidth={2.4} />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DOW.map(d => (
            <span key={d} className="pb-1 text-center text-[12px] font-semibold text-ink-3">{d}</span>
          ))}
          {cells.map((c, i) => {
            if (c.n == null || !c.key) return <span key={`e-${i}`} />;
            const sel = c.key === selectedKey;
            const today = c.key === todayKey;
            return (
              <button
                key={c.key}
                type="button"
                disabled={c.sun}
                onClick={() => {
                  const off = skipSunday(offsetFromDay(c.key!), 1);
                  onSelect(off);
                  onClose();
                }}
                className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-[12px]"
                style={{
                  background: sel ? 'rgb(var(--c-ink))' : 'transparent',
                  color: sel ? '#fff' : c.sun ? 'rgb(var(--c-ink-3))' : 'rgb(var(--c-ink))',
                  boxShadow: today && !sel ? 'inset 0 0 0 1.5px rgb(var(--c-ink))' : undefined,
                }}
              >
                <span className="text-[15px] font-semibold">{c.n}</span>
                <span
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: busy.has(c.key) ? (sel ? '#fff' : '#d000a8') : 'transparent' }}
                />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => { onSelect(0); onClose(); }}
          className="mt-4 h-[50px] w-full rounded-pill bg-track text-body font-semibold"
        >
          Ir a hoy
        </button>
      </div>
    </div>
  );
}
