'use client';

import { useState, useTransition, type Dispatch, type SetStateAction } from 'react';
import { Field, inputCls } from '@/components/Sheet';
import { closeSession } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import type { AgendaAppt } from '@/lib/types';

const BODY = [
  { metric: 'CINTURA', unit: 'cm' },
  { metric: 'CADERA', unit: 'cm' },
  { metric: 'PESO', unit: 'kg' },
] as const;

export function useSessionClose(appt: AgendaAppt, onDone: () => void) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(appt.param_keys.map(k => [k, ''])),
  );
  const [measures, setMeasures] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const showBody = appt.category === 'corporal';

  const save = (skipExtras = false) => {
    setError(null);
    startTransition(async () => {
      const r = await closeSession(createClient(), {
        appointmentId: appt.id,
        params: skipExtras ? {} : params,
        note: skipExtras ? undefined : note,
        measurements: skipExtras || !showBody
          ? []
          : BODY.filter(m => measures[m.metric]?.trim()).map(m => ({
              metric: m.metric,
              value: Number(measures[m.metric].replace(',', '.')),
              unit: m.unit,
            })).filter(m => Number.isFinite(m.value)),
      });
      if (!r.ok) setError(r.error ?? 'No se ha podido cerrar');
      else onDone();
    });
  };

  return { pending, error, params, setParams, measures, setMeasures, note, setNote, showBody, save };
}

export function SessionCloseFields({
  appt, params, setParams, measures, setMeasures, note, setNote, showBody,
}: {
  appt: AgendaAppt;
  params: Record<string, string>;
  setParams: Dispatch<SetStateAction<Record<string, string>>>;
  measures: Record<string, string>;
  setMeasures: Dispatch<SetStateAction<Record<string, string>>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  showBody: boolean;
}) {
  return (
    <div className="mb-1 rounded-field border border-emerald-200 bg-emerald-50/60 p-3.5">
      <p className="mb-3 text-[13px] font-bold text-emerald-800">
        Cerrar sesión · {appt.service_name}
      </p>

      {appt.param_keys.length > 0 && (
        <Field label="Parámetros de máquina">
          <div className="grid grid-cols-2 gap-2">
            {appt.param_keys.map(key => (
              <label key={key} className="min-w-0">
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[.03em] text-ink-3">
                  {key}
                </span>
                <input
                  className={inputCls}
                  value={params[key] ?? ''}
                  onChange={e => setParams(p => ({ ...p, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </Field>
      )}

      {showBody && (
        <Field label="Medidas (opcional)">
          <div className="grid grid-cols-3 gap-2">
            {BODY.map(m => (
              <label key={m.metric} className="min-w-0">
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[.03em] text-ink-3">
                  {m.metric}
                </span>
                <input
                  className={inputCls}
                  inputMode="decimal"
                  placeholder={m.unit}
                  value={measures[m.metric] ?? ''}
                  onChange={e => setMeasures(s => ({ ...s, [m.metric]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </Field>
      )}

      <Field label="Nota de sesión">
        <textarea
          className={`${inputCls} min-h-[72px] resize-none`}
          placeholder="Cómo ha ido, reacción, siguiente cita…"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </Field>
    </div>
  );
}

export function SessionCloseActions({
  pending, error, save, onCancel,
}: {
  pending: boolean;
  error: string | null;
  save: (skipExtras?: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <>
      {error && (
        <p className="mb-2.5 rounded-[12px] bg-pink-50 px-3 py-2 text-[12px] font-semibold text-pink-700">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => save(false)}
        className="w-full rounded-field bg-emerald-500 py-3 text-[14px] font-extrabold text-white disabled:opacity-40"
      >
        {pending ? 'Guardando…' : 'Guardar y marcar hecha'}
      </button>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-field border border-surface-line bg-white py-2.5 text-[13px] font-bold text-ink-2"
        >
          Seguir en cabina
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save(true)}
          className="flex-1 rounded-field border border-surface-line bg-white py-2.5 text-[13px] font-bold text-ink-2"
        >
          Hecha sin datos
        </button>
      </div>
    </>
  );
}
