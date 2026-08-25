'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { fmt, minutesOfDay } from '@/lib/time';
import { CATEGORIES, STATUS } from '@/lib/categories';
import type { WeekDay } from '@/lib/types';

export default function WeekGrid({
  days, selectedPro,
}: {
  days: WeekDay[];
  selectedPro?: string | null;
}) {
  const router = useRouter();

  const href = (offset: number, extra?: Record<string, string>) => {
    const q = new URLSearchParams({ day: String(offset), mode: 'dia' });
    if (selectedPro) q.set('pro', selectedPro);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) q.set(k, v);
    }
    return `/agenda?${q.toString()}`;
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 pb-16">
      <div className="flex flex-col gap-2">
        {days.map(d => {
          const n = d.appointments.length;
          return (
            <section
              key={d.offset}
              className={`overflow-hidden rounded-row border shadow-card ${
                d.isToday ? 'border-v/40 bg-v-tint' : 'border-surface-line bg-white'
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => router.push(href(d.offset))}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[14px] font-extrabold tracking-[-.02em]">{d.name}</span>
                    <span className="text-[13px] font-bold tabular-nums text-ink-2">{d.num}</span>
                    {d.isToday && (
                      <span className="rounded-[6px] bg-grad px-1.5 py-px text-[9.5px] font-extrabold text-white">Hoy</span>
                    )}
                  </span>
                  <span className="block text-[11px] font-semibold text-ink-3">
                    {n === 0 ? 'Sin citas' : n === 1 ? '1 cita' : `${n} citas`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(href(d.offset, { new: '1' }))}
                  aria-label={`Nueva cita el ${d.name}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white text-v-d shadow-card"
                >
                  <Plus size={16} strokeWidth={2.4} />
                </button>
              </div>
              {n > 0 && (
                <div className="border-t border-surface-line/80">
                  {d.appointments.map(a => {
                    const cat = CATEGORIES[a.category];
                    const st = STATUS[a.status];
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => router.push(href(d.offset, { appt: a.id }))}
                        className="flex w-full items-center gap-2 border-b border-surface-line/70 px-3 py-2 text-left last:border-0 hover:bg-white/70"
                      >
                        <span className="w-[42px] shrink-0 text-[12.5px] font-extrabold tabular-nums text-v-d">
                          {fmt(minutesOfDay(a.starts_at))}
                        </span>
                        <span
                          className="h-2 w-2 shrink-0 rounded-sm"
                          style={{ background: a.status === 'done' ? st.edge : cat.color }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold">{a.client_label}</span>
                          <span className="block truncate text-[11px] font-medium text-ink-3">
                            {a.service_name}{a.provider_name ? ` · ${a.provider_name.split(' ')[0]}` : ''}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
