'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import PersonalHeader from '@/components/personal/PersonalHeader';
import TaskRow from '@/components/personal/TaskRow';
import { monthCells, shiftMonth, taskWhenLabel, type PersonalTask } from '@/lib/personal-tasks';
import { dayKey, toTimestamp } from '@/lib/time';
import { shallowSet } from '@/hooks/useShallowQuery';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function parseMonth(raw: string | null, todayKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(raw ?? '');
  if (match) return { year: Number(match[1]), month: Number(match[2]) };
  return { year: Number(todayKey.slice(0, 4)), month: Number(todayKey.slice(5, 7)) };
}

export default function PersonalCalendarView({
  tasks,
  todayKey,
  greeting,
}: {
  tasks: PersonalTask[];
  todayKey: string;
  greeting: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(sp.get('dia') ?? '') ? sp.get('dia')! : todayKey;
  const { year, month } = parseMonth(sp.get('mes'), todayKey);
  const [monthPicker, setMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const mesKey = `${year}-${String(month).padStart(2, '0')}`;

  const go = (nextYear: number, nextMonth: number, dia: string) => {
    const mes = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    router.replace(`/calendario?mes=${mes}&dia=${dia}`);
  };

  const dayTasks = tasks
    .filter(t => t.due_at && dayKey(t.due_at) === selected)
    .sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''));

  const pendingOn = (key: string) => tasks.filter(t => t.due_at && dayKey(t.due_at) === key && !t.done_at).length;
  const doneOn = (key: string) => tasks.some(t => t.due_at && dayKey(t.due_at) === key && t.done_at);

  const selectedTitle = selected === todayKey
    ? 'Hoy'
    : taskWhenLabel(toTimestamp(selected, 12 * 60) ?? `${selected}T12:00:00.000Z`, todayKey);

  const monthOffset = (y: number, m: number) => {
    const [ty, tm] = todayKey.split('-').map(Number);
    return (y - ty) * 12 + (m - tm);
  };

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-[22px] pb-fab pt-7">
      <PersonalHeader greeting={greeting} title="Calendario" dateIso={selected} />

      <div className="mt-[22px] flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => {
            const p = shiftMonth(year, month, -1);
            go(p.year, p.month, selected);
          }}
          className="grid h-[38px] w-[38px] place-items-center rounded-pill bg-surface-soft text-ink"
        >
          <ChevronLeft size={14} strokeWidth={2.8} />
        </button>
        <button
          type="button"
          onClick={() => { setMonthPicker(v => !v); setPickerYear(year); }}
          className="flex items-center gap-1.5 border-none bg-transparent text-[16px] font-bold tracking-[-.01em] text-ink"
        >
          {MESES[month - 1]} {year}
          <ChevronDown size={12} strokeWidth={2.8} />
        </button>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => {
            const n = shiftMonth(year, month, 1);
            go(n.year, n.month, selected);
          }}
          className="grid h-[38px] w-[38px] place-items-center rounded-pill bg-surface-soft text-ink"
        >
          <ChevronRight size={14} strokeWidth={2.8} />
        </button>
      </div>

      {monthPicker ? (
        <div className="mt-3.5 rounded-[20px] bg-surface-soft p-4">
          <div className="flex items-center justify-center gap-[18px]">
            <button
              type="button"
              onClick={() => setPickerYear(y => y - 1)}
              className="grid h-[34px] w-[34px] place-items-center rounded-pill bg-white"
            >
              <ChevronLeft size={12} strokeWidth={2.8} />
            </button>
            <span className="text-[15px] font-bold">{pickerYear}</span>
            <button
              type="button"
              onClick={() => setPickerYear(y => y + 1)}
              className="grid h-[34px] w-[34px] place-items-center rounded-pill bg-white"
            >
              <ChevronRight size={12} strokeWidth={2.8} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {MESES.map((name, i) => {
              const on = i + 1 === month && pickerYear === year;
              const isNow = i + 1 === Number(todayKey.slice(5, 7)) && pickerYear === Number(todayKey.slice(0, 4));
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    const off = monthOffset(pickerYear, i + 1);
                    const [ty, tm, td] = todayKey.split('-').map(Number);
                    const utc = new Date(Date.UTC(ty, tm - 1 + off, td));
                    const ny = utc.getUTCFullYear();
                    const nm = utc.getUTCMonth() + 1;
                    go(ny, nm, selected);
                    setMonthPicker(false);
                  }}
                  className={`h-[42px] rounded-xl text-[13px] font-semibold ${
                    on ? 'bg-v-2 text-white' : 'bg-white text-ink'
                  } ${isNow && !on ? 'shadow-[inset_0_0_0_2px_rgb(var(--c-brand-2))]' : ''}`}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              go(Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7)), todayKey);
              setMonthPicker(false);
            }}
            className="mt-3 h-10 w-full rounded-pill border-[1.5px] border-[#E6E5EC] bg-white text-[13px] font-semibold"
          >
            Volver a hoy
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3.5 grid grid-cols-7 gap-y-0.5">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(w => (
              <span key={w} className="py-1 text-center text-[11px] font-bold text-[#B7B4C4]">{w}</span>
            ))}
            {cells.map(cell => {
              const nPend = pendingOn(cell.key);
              const hecho = doneOn(cell.key);
              const isToday = cell.key === todayKey;
              const isSel = cell.key === selected;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    const cy = Number(cell.key.slice(0, 4));
                    const cm = Number(cell.key.slice(5, 7));
                    go(cy, cm, cell.key);
                  }}
                  className="relative flex h-11 items-center justify-center bg-transparent p-0"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[14.5px] ${
                      isSel ? 'bg-v-2 font-bold text-white' : nPend > 0 ? 'bg-[#E8F2FF] font-bold text-[#0463D1]' : isToday ? 'font-bold text-ink shadow-[inset_0_0_0_2px_rgb(var(--c-brand-2))]' : cell.inMonth ? 'font-medium text-ink' : 'font-medium text-[#C6C4D2]'
                    }`}
                  >
                    {Number(cell.key.slice(8))}
                  </span>
                  {hecho && nPend === 0 && !isSel && (
                    <span className="absolute bottom-0.5 left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#C6C4D2]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-3.5">
            {[
              ['Elegido', 'bg-v-2 text-white font-bold'],
              ['Con tareas', 'bg-[#E8F2FF] text-[#0463D1] font-bold'],
              ['Hoy', 'text-ink font-bold shadow-[inset_0_0_0_2px_rgb(var(--c-brand-2))]'],
            ].map(([label, cls]) => (
              <span key={label as string} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-2">
                <span className={`grid h-[22px] w-[22px] place-items-center rounded-full text-[10.5px] ${cls as string}`}>7</span>
                {label as string}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-2">
              <span className="flex flex-col items-center">
                <span className="flex h-5 w-[22px] items-center justify-center text-[10.5px] font-semibold">7</span>
                <span className="h-1 w-1 rounded-full bg-[#C6C4D2]" />
              </span>
              Todo hecho
            </span>
          </div>
        </>
      )}

      <div className="mt-[18px] flex items-baseline justify-between">
        <span className="text-[17px] font-bold">{selectedTitle}</span>
        {dayTasks.length > 0 && (
          <span className="text-[13px] font-semibold text-ink-3">{dayTasks.length}</span>
        )}
      </div>
      {dayTasks.length === 0 ? (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-row bg-surface-soft p-4">
          <span className="flex-1 text-[14px] text-ink-2">Nada este día.</span>
          <button
            type="button"
            onClick={() => shallowSet({ tarea: '1', dia: selected })}
            className="h-9 rounded-pill border-[1.5px] border-surface-line bg-white px-3.5 text-[13px] font-semibold"
          >
            + Tarea
          </button>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2">
          {dayTasks.map(task => (
            <TaskRow key={task.id} task={task} todayKey={todayKey} />
          ))}
        </div>
      )}
    </div>
  );
}
