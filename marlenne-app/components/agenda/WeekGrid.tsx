'use client';

import { useRouter } from 'next/navigation';
import { DAY_START, DAY_END, minutesOfDay } from '@/lib/time';
import { CATEGORIES } from '@/lib/categories';
import type { WeekDay } from '@/lib/types';

export default function WeekGrid({ days }: { days: WeekDay[] }) {
  const router = useRouter();
  const H = 280;
  const span = DAY_END - DAY_START;

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(d => (
          <button
            key={d.offset}
            onClick={() => router.push(`/agenda?day=${d.offset}&mode=dia`)}
            className="rounded-field px-[5px] py-2 transition hover:-translate-y-0.5"
            style={{
              background: d.isToday ? 'linear-gradient(160deg,#8B5CF6,#A855F7)' : '#fff',
              border: `1px solid ${d.isToday ? 'transparent' : '#EFEDF8'}`,
              boxShadow: d.isToday ? '0 12px 28px rgba(139,92,246,.34)' : '0 4px 20px rgba(60,40,120,.07)',
            }}
          >
            <div className="text-center">
              <div className="text-[9.5px] font-bold tracking-[.06em]" style={{ color: d.isToday ? 'rgba(255,255,255,.8)' : '#9B96B8' }}>
                {d.dow}
              </div>
              <div className="mt-px text-base font-extrabold" style={{ color: d.isToday ? '#fff' : '#1B1830' }}>
                {d.num}
              </div>
            </div>
            <div className="relative my-2" style={{ height: H }}>
              {d.appointments.map(a => (
                <div
                  key={a.id}
                  className="absolute left-0.5 right-0.5 rounded-[5px]"
                  style={{
                    top: ((minutesOfDay(a.starts_at) - DAY_START) / span) * H,
                    height: Math.max(5, (a.duration_min / span) * H - 2),
                    background: d.isToday ? 'rgba(255,255,255,.55)' : CATEGORIES[a.category].color,
                  }}
                />
              ))}
            </div>
            <div className="text-center text-[10px] font-bold" style={{ color: d.isToday ? 'rgba(255,255,255,.85)' : '#9B96B8' }}>
              {d.appointments.length}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-3.5 text-center text-xs font-medium text-ink-3">Toca un día para abrirlo</p>
    </div>
  );
}
