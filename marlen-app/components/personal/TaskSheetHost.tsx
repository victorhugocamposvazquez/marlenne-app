'use client';

import { useEffect, useState, useTransition } from 'react';
import { deletePersonalTask, getPersonalTask, savePersonalTask } from '@/app/actions/personal-tasks';
import { Field, LocalSheet, inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import { dayKey, minutesOfDay } from '@/lib/time';
import type { RemindChoice } from '@/lib/personal-tasks';

function close() {
  shallowSet({ tarea: null });
}

export default function TaskSheetHost() {
  const tarea = useShallowParam('tarea');
  const open = Boolean(tarea);
  const editing = tarea && tarea !== '1' ? tarea : null;
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [remind, setRemind] = useState<RemindChoice>('none');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!editing) {
      const dia = new URLSearchParams(window.location.search).get('dia') ?? '';
      setTitle('');
      setNote('');
      setDate(/^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : '');
      setTime('');
      setRemind('none');
      return;
    }
    let alive = true;
    void getPersonalTask(editing).then(task => {
      if (!alive || !task) return;
      setTitle(task.title);
      setNote(task.note ?? '');
      if (task.due_at) {
        setDate(dayKey(task.due_at));
        const mins = minutesOfDay(task.due_at);
        setTime(mins > 0
          ? `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
          : '');
      } else {
        setDate('');
        setTime('');
      }
      setRemind(task.remind_at ? 'at' : 'none');
    });
    return () => { alive = false; };
  }, [open, editing]);

  if (!open) return null;

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

  return (
    <LocalSheet
      open
      onClose={close}
      title={editing ? 'Tarea' : 'Nueva tarea'}
      initialHeight="tall"
      footer={(
        <div className="flex flex-col gap-2">
          <Button size="lg" full disabled={pending || !title.trim()} onClick={save}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
          {editing && (
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="min-h-[44px] text-body font-bold text-danger-fg"
            >
              Borrar
            </button>
          )}
        </div>
      )}
    >
      <Field label="Qué hay que hacer">
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Llamar, comprar, revisar…" />
      </Field>
      <Field label="Nota">
        <textarea className={`${inputCls} min-h-[72px]`} value={note} onChange={e => setNote(e.target.value)} />
      </Field>
      <Field label="Día">
        <input className={inputCls} type="date" value={date} onChange={e => setDate(e.target.value)} />
      </Field>
      <Field label="Hora">
        <input className={inputCls} type="time" value={time} onChange={e => setTime(e.target.value)} />
      </Field>
      <Field label="Aviso">
        <select
          className={inputCls}
          value={remind}
          onChange={e => setRemind(e.target.value as RemindChoice)}
          disabled={!date}
        >
          <option value="none">Sin aviso</option>
          <option value="at">{time ? 'A la hora' : 'Ese día a las 9:00'}</option>
          <option value="15">15 minutos antes</option>
          <option value="60">1 hora antes</option>
          <option value="day">El día anterior</option>
        </select>
      </Field>
      {error && <p className="text-label font-semibold text-danger-fg">{error}</p>}
    </LocalSheet>
  );
}
