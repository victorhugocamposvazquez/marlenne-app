'use client';

import { useState, useTransition } from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { dateLbl } from '@/lib/time';
import { deleteTreatmentPhoto } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import type { TreatmentPhoto, TreatmentRow } from '@/lib/types';
import { Empty } from './Tabs';
import PhotoUpload from './PhotoUpload';

type Group = {
  key: string;
  title: string;
  zone: string | null;
  session: number | null;
  takenAt: string;
  before?: TreatmentPhoto;
  after?: TreatmentPhoto;
};

function Frame({
  photo, url, label, askId, pending, onAsk, onCancel, onDelete,
}: {
  photo?: TreatmentPhoto;
  url?: string;
  label: string;
  askId: string | null;
  pending: boolean;
  onAsk: (id: string) => void;
  onCancel: () => void;
  onDelete: (photo: TreatmentPhoto) => void;
}) {
  const asking = !!(photo && askId === photo.id);

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-micro font-bold uppercase tracking-[.03em] text-ink-3">{label}</div>
      {photo && url ? (
        <div className="relative">
          {/* Enlace firmado y temporal del bucket privado: no pasa por el optimizador. */}
          <img
            src={url}
            alt={`${label} · ${photo.zone ?? ''}`}
            loading="lazy"
            className="aspect-[3/4] w-full rounded-icon border border-surface-line object-cover"
          />
          {asking ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-icon bg-ink/60 p-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => onDelete(photo)}
                className="rounded-chip bg-danger px-3 py-1.5 text-label font-extrabold text-white disabled:opacity-40"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="text-caption font-bold text-white"
              >
                Dejarla
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Borrar foto ${label}`}
              onClick={() => onAsk(photo.id)}
              className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-chip bg-surface-card/90 text-danger-fg shadow-card"
            >
              <Trash2 size={14} strokeWidth={2.3} />
            </button>
          )}
        </div>
      ) : (
        <div className="grid aspect-[3/4] w-full place-items-center rounded-icon border border-dashed border-handle bg-surface-bg/50 text-caption font-semibold text-ink-3">
          Sin foto
        </div>
      )}
    </div>
  );
}

export default function PhotosTab({
  treatments, urls, photoConsent, onUploaded,
}: {
  treatments: TreatmentRow[];
  urls: Record<string, string>;
  photoConsent: boolean;
  onUploaded?: () => void;
}) {
  const toast = useToast();
  const [askId, setAskId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const groups = new Map<string, Group>();

  for (const t of treatments) {
    for (const p of t.treatment_photos ?? []) {
      const key = `${t.id}|${p.session_no ?? 0}|${p.zone ?? ''}`;
      const g = groups.get(key) ?? {
        key,
        title: t.service?.name ?? 'Tratamiento',
        zone: p.zone ?? t.zone,
        session: p.session_no,
        takenAt: p.taken_at,
      };
      if (p.kind === 'before') g.before = p;
      else g.after = p;
      if (+new Date(p.taken_at) > +new Date(g.takenAt)) g.takenAt = p.taken_at;
      groups.set(key, g);
    }
  }

  const list = [...groups.values()].sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt));

  const remove = (photo: TreatmentPhoto) => {
    startTransition(async () => {
      const r = await deleteTreatmentPhoto(createClient(), {
        id: photo.id,
        storagePath: photo.storage_path,
      });
      if (!r.ok) toast(r.error ?? 'No se ha podido borrar', 'err');
      else {
        setAskId(null);
        toast('Foto borrada');
        onUploaded?.();
      }
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <PhotoUpload treatments={treatments} onUploaded={onUploaded} />
      {!list.length && <Empty>Todavía no hay fotos de esta clienta.</Empty>}
      {list.length > 0 && !photoConsent && (
        <p className="flex items-start gap-2 rounded-row border border-warn-line bg-warn-bg p-3 text-label font-semibold leading-snug text-warn-fg">
          <ShieldAlert size={16} strokeWidth={2.2} className="mt-px shrink-0" />
          Hay fotos guardadas y no consta consentimiento de imagen. Son datos de salud:
          conviene registrarlo antes de seguir usándolas.
        </p>
      )}

      {list.map(g => (
        <article key={g.key} className="rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
          <div className="mb-2.5 flex items-baseline gap-2">
            <h3 className="min-w-0 flex-1 truncate text-body font-bold tracking-[-.01em]">{g.title}</h3>
            {g.session !== null && (
              <span className="shrink-0 rounded-badge bg-v-soft px-2 py-1 text-micro font-bold text-v-d">
                Sesión {g.session}
              </span>
            )}
          </div>
          <div className="flex gap-2.5">
            <Frame
              photo={g.before}
              url={g.before && urls[g.before.storage_path]}
              label="Antes"
              askId={askId}
              pending={pending}
              onAsk={setAskId}
              onCancel={() => setAskId(null)}
              onDelete={remove}
            />
            <Frame
              photo={g.after}
              url={g.after && urls[g.after.storage_path]}
              label="Después"
              askId={askId}
              pending={pending}
              onAsk={setAskId}
              onCancel={() => setAskId(null)}
              onDelete={remove}
            />
          </div>
          <p className="mt-2 text-micro font-semibold text-ink-3">
            {[g.zone, dateLbl(g.takenAt)].filter(Boolean).join(' · ')}
          </p>
        </article>
      ))}
    </div>
  );
}
