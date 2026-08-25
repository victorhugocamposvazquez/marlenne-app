import { ShieldAlert } from 'lucide-react';
import { dateLbl } from '@/lib/time';
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

function Frame({ photo, url, label }: { photo?: TreatmentPhoto; url?: string; label: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[.03em] text-ink-3">{label}</div>
      {photo && url ? (
        // Enlace firmado y temporal del bucket privado: no pasa por el optimizador.
        <img
          src={url}
          alt={`${label} · ${photo.zone ?? ''}`}
          loading="lazy"
          className="aspect-[3/4] w-full rounded-[14px] border border-surface-line object-cover"
        />
      ) : (
        <div className="grid aspect-[3/4] w-full place-items-center rounded-[14px] border border-dashed border-handle bg-surface-bg/50 text-[11px] font-semibold text-ink-3">
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

  return (
    <div className="flex flex-col gap-2.5">
      <PhotoUpload treatments={treatments} onUploaded={onUploaded} />
      {!list.length && <Empty>Todavía no hay fotos de esta clienta.</Empty>}
      {list.length > 0 && !photoConsent && (
        <p className="flex items-start gap-2 rounded-row border border-amber-200 bg-amber-50 p-3 text-[12px] font-semibold leading-snug text-amber-800">
          <ShieldAlert size={16} strokeWidth={2.2} className="mt-px shrink-0" />
          Hay fotos guardadas y no consta consentimiento de imagen. Son datos de salud:
          conviene registrarlo antes de seguir usándolas.
        </p>
      )}

      {list.map(g => (
        <article key={g.key} className="rounded-row border border-surface-line bg-white p-3.5 shadow-card">
          <div className="mb-2.5 flex items-baseline gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[14px] font-bold tracking-[-.01em]">{g.title}</h3>
            {g.session !== null && (
              <span className="shrink-0 rounded-[9px] bg-v-soft px-2 py-1 text-[10px] font-bold text-v-d">
                Sesión {g.session}
              </span>
            )}
          </div>
          <div className="flex gap-2.5">
            <Frame photo={g.before} url={g.before && urls[g.before.storage_path]} label="Antes" />
            <Frame photo={g.after} url={g.after && urls[g.after.storage_path]} label="Después" />
          </div>
          <p className="mt-2 text-[10.5px] font-semibold text-ink-3">
            {[g.zone, dateLbl(g.takenAt)].filter(Boolean).join(' · ')}
          </p>
        </article>
      ))}
    </div>
  );
}
