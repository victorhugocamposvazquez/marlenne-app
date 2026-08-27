'use client';

import { useState, useTransition } from 'react';
import Sheet, { Chip, Field, inputCls, useCloseSheet } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import { createBlock, deleteBlock } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { BLOCK_REASONS, type BlockReason } from '@/lib/consents';
import { DAY_START, durLbl, fmt } from '@/lib/time';
import type { AgendaBlock, Provider } from '@/lib/types';

const DURATIONS = [30, 45, 60, 90, 120];

export default function BlockSheet({
  day, providers, existing,
}: {
  day: string;
  providers: Provider[];
  existing?: AgendaBlock | null;
}) {
  const close = useCloseSheet();
  const [pending, startTransition] = useTransition();
  const [providerId, setProviderId] = useState(existing?.provider_id ?? providers[0]?.id ?? '');
  const [date, setDate] = useState(day);
  const [startMin, setStartMin] = useState(DAY_START + 180);
  const [duration, setDuration] = useState(60);
  const [reason, setReason] = useState<BlockReason>('comida');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [repeatWeekdays, setRepeatWeekdays] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existing) {
    return (
      <Sheet
        title={existing.label ?? BLOCK_REASONS[existing.reason as BlockReason] ?? 'Bloqueo'}
        subtitle="Quitar este hueco de la agenda"
        footer={
          <>
            {error && <p className="mb-2 text-label font-semibold text-danger-fg">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 text-ink-2" onClick={close}>
                Dejarlo
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={pending}
                onClick={() => startTransition(async () => {
                  const r = await deleteBlock(createClient(), existing.id);
                  if (!r.ok) setError(r.error ?? 'No se ha podido borrar');
                  else close();
                })}
              >
                Quitar bloqueo
              </Button>
            </div>
          </>
        }
      >
        <p className="mb-1 text-body font-medium leading-snug text-ink-2">
          Este hueco deja de estar bloqueado y vuelve a poder citarse.
        </p>
      </Sheet>
    );
  }

  const save = () => {
    setError(null);
    startTransition(async () => {
      const r = await createBlock(createClient(), {
        providerId, date, startMin, durationMin: duration, reason, label,
        weekdays: repeatWeekdays,
      });
      if (!r.ok) setError(r.error ?? 'No se ha podido bloquear');
      else close();
    });
  };

  return (
    <Sheet
      title="Bloquear hueco"
      subtitle="Comida, descanso o cabina ocupada"
      footer={
        <>
          {error && <p className="mb-2 text-label font-semibold text-danger-fg">{error}</p>}
          <Button size="lg" full onClick={save} disabled={pending || !providerId}>
            {pending ? 'Guardando…' : repeatWeekdays ? 'Bloquear laborables' : 'Bloquear'}
          </Button>
        </>
      }
    >
      {providers.length > 1 && (
        <Field label="Profesional">
          <div className="flex flex-wrap gap-2">
            {providers.map(p => (
              <Chip key={p.id} active={p.id === providerId} onClick={() => setProviderId(p.id)}>
                {p.full_name.split(' ')[0]}
              </Chip>
            ))}
          </div>
        </Field>
      )}
      <Field label="Motivo">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BLOCK_REASONS) as BlockReason[]).map(id => (
            <Chip key={id} active={id === reason} onClick={() => setReason(id)}>
              {BLOCK_REASONS[id]}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Día">
        <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} aria-label="Día" />
      </Field>
      <Field label="Empieza">
        <input
          type="time"
          className={inputCls}
          value={fmt(startMin)}
          onChange={e => {
            const [h, m] = e.target.value.split(':').map(Number);
            setStartMin(h * 60 + m);
          }}
          aria-label="Hora de inicio"
        />
      </Field>
      <Field label="Duración">
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map(d => (
            <Chip key={d} active={d === duration} onClick={() => setDuration(d)}>
              {durLbl(d)}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Etiqueta">
        <input className={inputCls} placeholder="Comida, formación…" value={label} onChange={e => setLabel(e.target.value)} />
      </Field>
      <label className="mb-3 flex items-start gap-2.5 rounded-field border border-surface-line bg-surface-card px-3.5 py-3">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 accent-v"
          checked={repeatWeekdays}
          onChange={e => setRepeatWeekdays(e.target.checked)}
        />
        <span>
          <span className="block text-body font-bold">Laborables, 4 semanas</span>
          <span className="block text-caption font-medium text-ink-3">
            Lunes a viernes a esta hora. Los días que ya estén ocupados se saltan.
          </span>
        </span>
      </label>
    </Sheet>
  );
}
