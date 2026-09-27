'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import DayStrip from '@/components/agenda/DayStrip';
import { deletePersonalTask, getPersonalTask, savePersonalTask } from '@/app/actions/personal-tasks';
import PersonalChip from '@/components/personal/PersonalChip';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import {
  monthCells,
  remindChoiceLabel,
  remindFromLabel,
  shiftMonth,
  type RemindChoice,
} from '@/lib/personal-tasks';
import { alignStripStart, dateFromOffset, dayKey, minutesOfDay, offsetFromDay } from '@/lib/time';

const pickStripStart = (off: number) => alignStripStart(off, off, 5);
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const QUICK_TIMES = ['09:00', '12:00', '17:00'];
const REMIND_LABELS = ['Sin aviso', '15 min antes', '1 h antes', '1 día antes'] as const;

function close() {
  shallowSet({ tarea: null, dia: null });
}

export default function TaskSheetHost() {
  const tarea = useShallowParam('tarea');
  const open = Boolean(tarea);
  const editing = tarea && tarea !== '1' ? tarea : null;
  const todayKey = dayKey(new Date());

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [remind, setRemind] = useState<RemindChoice>('none');
  const [dayOff, setDayOff] = useState(0);
  const [stripStart, setStripStart] = useState(0);
  const [shCal, setShCal] = useState(false);
  const [shCalM, setShCalM] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setShCal(false);
    if (!editing) {
      const dia = new URLSearchParams(window.location.search).get('dia') ?? '';
      const d = /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : todayKey;
      setTitle('');
      setNote('');
      setDate(d);
      setTime('');
      setRemind('none');
      const off = offsetFromDay(d);
      setDayOff(off);
      setStripStart(pickStripStart(off));
      return;
    }
    let alive = true;
    void getPersonalTask(editing).then(task => {
      if (!alive || !task) return;
      setTitle(task.title);
      setNote(task.note ?? '');
      if (task.due_at) {
        const d = dayKey(task.due_at);
        setDate(d);
        const off = offsetFromDay(d);
        setDayOff(off);
        setStripStart(pickStripStart(off));
        const mins = minutesOfDay(task.due_at);
        setTime(mins > 0
          ? `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
          : '');
      } else {
        setDate('');
        setTime('');
        setDayOff(0);
        setStripStart(0);
      }
      setRemind(task.remind_at ? 'at' : 'none');
    });
    return () => { alive = false; };
  }, [open, editing, todayKey]);

  const ok = Boolean(title.trim() && date);
  const remindLabel = remindChoiceLabel(remind, Boolean(time));
  const hasTime = Boolean(time);

  const shView = useMemo(() => {
    const base = date || todayKey;
    const by = Number(base.slice(0, 4));
    const bm = Number(base.slice(5, 7));
    return shiftMonth(by, bm, shCalM);
  }, [date, todayKey, shCalM]);
  const shCells = monthCells(shView.year, shView.month);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await savePersonalTask({
        id: editing ?? undefined,
        title,
        note,
        date,
        time,
        remind,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
    });
  };

  const remove = () => {
    if (!editing) return;
    startTransition(async () => {
      const result = await deletePersonalTask(editing);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
    });
  };

  if (!open || !mounted) return null;

  const pickDay = (off: number) => {
    setDayOff(off);
    setDate(dayKey(dateFromOffset(off)));
    setStripStart(prev => alignStripStart(off, prev, 5));
  };

  const sheet = (
    <>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={close}
        className="fixed inset-0 z-[60] bg-[rgba(15,14,26,.32)]"
      />
      <div className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[92dvh] max-w-[440px] flex-col rounded-t-[28px] bg-white shadow-[0_-16px_50px_rgba(15,14,26,.18)]">
        <div className="flex justify-center pt-2.5">
          <span className="h-[5px] w-11 rounded-pill bg-[#E6E5EC]" />
        </div>
        <div className="flex items-center justify-between px-[22px] pt-2.5">
          <span className="text-[20px] font-extrabold tracking-[-.02em]">
            {editing ? 'Editar tarea' : 'Nueva tarea'}
          </span>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="grid h-[38px] w-[38px] place-items-center rounded-pill bg-track"
          >
            <X size={14} strokeWidth={2.6} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-2 pt-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="¿Qué hay que hacer?"
            className="h-[54px] w-full rounded-row border-none bg-surface-soft px-4 text-[16px] font-semibold outline-none"
          />

          <div className="mt-[18px] flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink-2">Día</span>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <DayStrip
                  allowSundays
                  selectedOffset={dayOff}
                  startOffset={alignStripStart(dayOff, stripStart, 5)}
                  onSelect={pickDay}
                />
              </div>
              <button
                type="button"
                onClick={() => { setShCal(o => !o); setShCalM(0); }}
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-pill border-2 ${shCal ? 'border-v-2 bg-[#E8F2FF]' : 'border-ink bg-white'}`}
                aria-label="Calendario"
              >
                <Calendar size={20} strokeWidth={2} className={shCal ? 'text-[#0463D1]' : 'text-ink'} />
              </button>
            </div>
          </div>

          <div className="mt-[18px] flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink-2">Hora</span>
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_TIMES.map(hr => (
                <PersonalChip key={hr} on={time === hr} label={hr} onClick={() => setTime(hr)} />
              ))}
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="h-10 rounded-pill border-[1.5px] border-surface-line bg-white px-3 text-[13.5px] font-semibold outline-none"
              />
            </div>
          </div>

          <div className="mt-[18px] flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink-2">Avisarme</span>
            <div className="flex flex-wrap gap-2">
              {REMIND_LABELS.map(label => (
                <PersonalChip
                  key={label}
                  on={remindLabel === label || (label === '1 h antes' && remind === 'at' && !hasTime)}
                  label={label}
                  onClick={() => setRemind(remindFromLabel(label, hasTime))}
                />
              ))}
            </div>
          </div>

          <div className="mt-[18px] flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink-2">
              Nota <span className="font-normal text-ink-3">· opcional</span>
            </span>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Añade un detalle…"
              rows={2}
              className="w-full resize-none rounded-row border-none bg-surface-soft px-4 py-3.5 text-[14.5px] outline-none"
            />
          </div>
          {error && <p className="mt-3 text-label font-semibold text-danger-fg">{error}</p>}
        </div>
        <div className="flex items-center gap-2.5 px-[22px] pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
          {editing && (
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="grid h-[52px] w-[50px] shrink-0 place-items-center rounded-pill border-[1.5px] border-danger-line bg-danger-bg"
            >
              <Trash2 size={17} strokeWidth={2.1} className="text-danger" />
            </button>
          )}
          <button
            type="button"
            disabled={!ok || pending}
            onClick={save}
            className="h-[52px] min-w-0 flex-1 rounded-pill border-none bg-v-2 text-[15.5px] font-bold text-white disabled:opacity-40"
          >
            {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Añadir tarea'}
          </button>
        </div>
      </div>

      {shCal && (
        <>
          <button type="button" aria-label="Cerrar calendario" onClick={() => setShCal(false)} className="fixed inset-0 z-[62] bg-[rgba(15,14,26,.32)]" />
          <div className="fixed inset-x-0 bottom-0 z-[63] mx-auto max-w-[440px] rounded-t-[28px] bg-white px-[22px] pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-16px_50px_rgba(15,14,26,.22)]">
            <div className="flex justify-center pt-2.5">
              <span className="h-[5px] w-11 rounded-pill bg-[#E6E5EC]" />
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <button type="button" onClick={() => setShCalM(m => m - 1)} className="grid h-10 w-10 place-items-center rounded-pill bg-track">
                <ChevronLeft size={14} strokeWidth={2.8} />
              </button>
              <span className="text-[17px] font-bold tracking-[-.01em]">
                {MESES[shView.month - 1]} {shView.year}
              </span>
              <button type="button" onClick={() => setShCalM(m => m + 1)} className="grid h-10 w-10 place-items-center rounded-pill bg-track">
                <ChevronRight size={14} strokeWidth={2.8} />
              </button>
            </div>
            <div className="mt-2.5 grid grid-cols-7">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(w => (
                <span key={w} className="py-1 text-center text-[11px] font-bold text-[#B7B4C4]">{w}</span>
              ))}
              {shCells.map(cell => {
                const on = date === cell.key;
                const isToday = cell.key === todayKey;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => {
                      pickDay(offsetFromDay(cell.key));
                      setShCal(false);
                    }}
                    className="flex h-11 items-center justify-center"
                  >
                    <span
                      className={`flex h-[38px] w-[38px] items-center justify-center rounded-[14px] text-[15px] ${
                        on ? 'bg-v-2 font-bold text-white' : isToday ? 'font-bold text-ink shadow-[inset_0_0_0_2px_rgb(var(--c-brand-2))]' : 'font-medium text-ink'
                      }`}
                    >
                      {Number(cell.key.slice(8))}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                pickDay(0);
                setShCalM(0);
                setShCal(false);
              }}
              className="mt-3 h-12 w-full rounded-pill border-none bg-track text-[14.5px] font-semibold"
            >
              Ir a hoy
            </button>
          </div>
        </>
      )}
    </>
  );

  return createPortal(sheet, document.body);
}
