'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { inputCls } from '@/components/Sheet';
import PhotoPick from '@/components/clienta/PhotoPick';
import { photoBusyKey, photoChoices, type PhotoKind, type PhotoTarget } from '@/lib/photos';
import type { ServiceOption, TreatmentRow } from '@/lib/types';

export default function PhotoUpload({
  clientId, treatments, services, pending, busy, error, onPick,
}: {
  clientId: string;
  treatments: TreatmentRow[];
  services: ServiceOption[];
  pending: boolean;
  busy: string | null;
  error: string | null;
  onPick: (file: File, target: PhotoTarget) => void;
}) {
  const choices = photoChoices(
    treatments.map(t => ({
      id: t.id,
      serviceId: t.service_id,
      name: t.service?.name ?? 'Tratamiento',
      zone: t.zone,
      closed: !!t.closed_at,
      sessionsDone: t.sessions_done,
    })),
    services.map(s => ({ id: s.id, name: s.name, category: s.category })),
  );
  const [key, setKey] = useState(choices[0]?.key ?? '');
  const chosen = choices.find(c => c.key === key) ?? choices[0];
  const target = (kind: PhotoKind): PhotoTarget => ({
    treatmentId: chosen?.treatmentId,
    serviceId: chosen?.serviceId,
    clientId,
    kind,
    zone: chosen?.zone,
    sessionNo: chosen?.sessionNo ?? undefined,
  });
  const pick = (kind: PhotoKind) => (file: File) => {
    if (!chosen) return;
    onPick(file, target(kind));
  };

  return (
    <div className="mb-3 rounded-row bg-surface-soft p-4">
      <div className="mb-2.5 flex items-center gap-2 text-body font-bold">
        <Camera size={16} strokeWidth={2.2} className="text-v" />
        Añadir foto
      </div>
      {choices.length > 0 ? (
        <select
          className={`${inputCls} mb-2.5`}
          aria-label="Tratamiento"
          value={chosen?.key ?? ''}
          onChange={e => setKey(e.target.value)}
        >
          {choices.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      ) : (
        <p className="mb-2 text-label font-semibold leading-snug text-ink-2">
          No hay tratamientos para elegir.
        </p>
      )}
      <p className="mb-2 text-caption font-medium leading-snug text-ink-2">
        Un lado es el antes, el otro el después. Cámara o el rollo.
      </p>
      <div className="flex gap-2.5">
        <Slot
          label="Antes"
          busy={!!chosen && pending && busy === photoBusyKey(target('before'))}
          disabled={pending || !chosen}
          onFile={pick('before')}
        />
        <Slot
          label="Después"
          busy={!!chosen && pending && busy === photoBusyKey(target('after'))}
          disabled={pending || !chosen}
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
