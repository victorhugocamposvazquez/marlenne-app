'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { inputCls } from '@/components/Sheet';
import PhotoPick from '@/components/clienta/PhotoPick';
import { photoBusyKey, type PhotoKind, type PhotoTarget } from '@/lib/photos';
import type { TreatmentRow } from '@/lib/types';

export default function PhotoUpload({
  treatments, pending, busy, error, onPick,
}: {
  treatments: TreatmentRow[];
  pending: boolean;
  busy: string | null;
  error: string | null;
  onPick: (file: File, target: PhotoTarget) => void;
}) {
  const open = treatments.filter(t => !t.closed_at);
  const options = open.length ? open : treatments.slice(0, 3);
  const [treatmentId, setTreatmentId] = useState(options[0]?.id ?? '');

  if (!options.length) return null;

  const chosen = treatments.find(t => t.id === treatmentId) ?? options[0];
  const target = (kind: PhotoKind): PhotoTarget => ({
    treatmentId: chosen.id,
    kind,
    zone: chosen.zone,
    sessionNo: chosen.sessions_done || undefined,
  });
  const pick = (kind: PhotoKind) => (file: File) => onPick(file, target(kind));

  return (
    <div className="mb-3 rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
      <div className="mb-2.5 flex items-center gap-2 text-body font-bold">
        <Camera size={16} strokeWidth={2.2} className="text-v" />
        Añadir foto
      </div>
      <select
        className={`${inputCls} mb-2.5`}
        aria-label="Tratamiento"
        value={chosen.id}
        onChange={e => setTreatmentId(e.target.value)}
      >
        {options.map(t => (
          <option key={t.id} value={t.id}>
            {t.service?.name ?? 'Tratamiento'}{t.zone ? ` · ${t.zone}` : ''}
          </option>
        ))}
      </select>
      <p className="mb-2 text-caption font-medium leading-snug text-ink-2">
        Un lado es el antes, el otro el después. Cámara o el rollo.
      </p>
      <div className="flex gap-2.5">
        <Slot
          label="Antes"
          busy={pending && busy === photoBusyKey(target('before'))}
          disabled={pending}
          onFile={pick('before')}
        />
        <Slot
          label="Después"
          busy={pending && busy === photoBusyKey(target('after'))}
          disabled={pending}
          onFile={pick('after')}
        />
      </div>
      {error && <p className="mt-2 text-label font-semibold text-danger-fg">{error}</p>}
    </div>
  );
}

function Slot({
  label, busy, disabled, onFile,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-caption font-bold uppercase tracking-[.03em] text-ink-2">{label}</div>
      <div className="rounded-icon border border-dashed border-handle bg-surface-bg/50 p-2.5">
        {busy ? (
          <p className="py-3 text-center text-caption font-semibold text-ink-2">Subiendo…</p>
        ) : (
          <PhotoPick label={label.toLowerCase()} disabled={disabled} onFile={onFile} />
        )}
      </div>
    </div>
  );
}
