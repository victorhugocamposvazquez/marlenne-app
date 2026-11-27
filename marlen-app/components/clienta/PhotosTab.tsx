'use client';

import { useState, useTransition } from 'react';
import { ShieldAlert, Trash2, X } from 'lucide-react';
import { dateLbl } from '@/lib/time';
import { deleteTreatmentPhoto } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useTreatmentPhoto } from '@/hooks/useTreatmentPhoto';
import {
  groupPhotosByTreatment,
  photoBusyKey,
  type PhotoCircleItem,
  type PhotoKind,
  type PhotoSessionGroup,
  type PhotoTarget,
} from '@/lib/photos';
import type { ServiceOption, TreatmentPhoto, TreatmentRow } from '@/lib/types';
import Skeleton from '@/components/ui/Skeleton';
import { Empty } from './Tabs';
import PhotoPick from './PhotoPick';
import PhotoUpload from './PhotoUpload';

const KIND_LABEL: Record<PhotoKind, string> = { before: 'Antes', after: 'Después' };

function PhotoCircle({
  photo, url, askId, pending, urlsReady, onAsk, onCancel, onDelete, onOpen,
}: {
  photo: PhotoCircleItem;
  url?: string;
  askId: string | null;
  pending: boolean;
  urlsReady: boolean;
  onAsk: (id: string) => void;
  onCancel: () => void;
  onDelete: (photo: TreatmentPhoto) => void;
  onOpen: (photo: PhotoCircleItem) => void;
}) {
  const label = KIND_LABEL[photo.kind];
  const asking = askId === photo.id;

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      {url ? (
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => onOpen(photo)}
            className="block aspect-square w-full overflow-hidden rounded-row border border-surface-line motion-safe:active:scale-[.98]"
            aria-label={`Ver foto ${label}`}
          >
            <img
              src={url}
              alt={`${label} · ${photo.zone ?? ''}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
          {asking ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-row bg-ink/70">
              <button
                type="button"
                disabled={pending}
                onClick={() => onDelete(photo)}
                className="text-micro font-extrabold text-white disabled:opacity-40"
              >
                Borrar
              </button>
              <button type="button" onClick={onCancel} className="mt-1 text-micro font-bold text-white/80">
                Dejarla
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Borrar foto ${label}`}
              onClick={() => onAsk(photo.id)}
              className="absolute -right-0.5 -top-0.5 grid h-8 w-8 place-items-center rounded-full bg-surface-card text-danger-fg shadow-card motion-safe:active:scale-[.96]"
            >
              <Trash2 size={13} strokeWidth={2.3} />
            </button>
          )}
        </div>
      ) : !urlsReady ? (
        <Skeleton className="aspect-square w-full rounded-row" />
      ) : (
        <p className="grid aspect-square w-full place-items-center rounded-row border border-surface-line px-2 text-center text-micro font-semibold text-ink-2">
          No se abre
        </p>
      )}
      <span className="text-micro font-bold uppercase tracking-[.03em] text-ink-2">{label}</span>
    </div>
  );
}

export default function PhotosTab({
  clientId, treatments, services = [], clientPhotos = [], urls, urlsReady = true, photoConsent, onUploaded,
}: {
  clientId: string;
  treatments: TreatmentRow[];
  services?: ServiceOption[];
  clientPhotos?: TreatmentPhoto[];
  urls: Record<string, string>;
  urlsReady?: boolean;
  photoConsent: boolean;
  onUploaded?: () => void;
}) {
  const toast = useToast();
  const [askId, setAskId] = useState<string | null>(null);
  const [openPhoto, setOpenPhoto] = useState<PhotoCircleItem | null>(null);
  const [pending, startTransition] = useTransition();
  const photo = useTreatmentPhoto(onUploaded);
  const albums = groupPhotosByTreatment(
    treatments.map(t => ({
      id: t.id,
      title: t.service?.name ?? 'Tratamiento',
      photos: t.treatment_photos ?? [],
    })),
    clientPhotos,
  );

  const remove = (item: TreatmentPhoto) => {
    startTransition(async () => {
      const r = await deleteTreatmentPhoto(createClient(), {
        id: item.id,
        storagePath: item.storage_path,
      });
      if (!r.ok) toast(r.error ?? 'No se ha podido borrar', 'err');
      else {
        setAskId(null);
        setOpenPhoto(current => (current?.id === item.id ? null : current));
        toast('Foto borrada');
        onUploaded?.();
      }
    });
  };

  const addTo = (treatmentId: string, session: PhotoSessionGroup, kind: PhotoKind) => (file: File) => {
    const target: PhotoTarget = treatmentId
      ? {
          treatmentId,
          clientId,
          kind,
          zone: session.zone,
          sessionNo: session.session ?? undefined,
        }
      : {
          clientId,
          kind,
          zone: session.zone,
          sessionNo: session.session ?? undefined,
        };
    photo.upload(file, target);
  };

  const openUrl = openPhoto ? urls[openPhoto.storage_path] : undefined;

  return (
    <div className="flex flex-col gap-2.5">
      <PhotoUpload
        clientId={clientId}
        treatments={treatments}
        services={services}
        pending={photo.pending}
        busy={photo.busy}
        error={photo.error}
        onPick={photo.upload}
      />
      {!albums.length && <Empty>Todavía no hay fotos de esta clienta.</Empty>}
      {photo.error && (
        <p className="rounded-row border border-danger-line bg-danger-bg px-3 py-2 text-label font-semibold text-danger-fg">
          {photo.error}
        </p>
      )}
      {albums.length > 0 && !photoConsent && (
        <p className="flex items-start gap-2 rounded-row border border-warn-line bg-warn-bg p-3 text-label font-semibold leading-snug text-warn-fg">
          <ShieldAlert size={16} strokeWidth={2.2} className="mt-px shrink-0" />
          Hay fotos guardadas y no consta consentimiento de imagen. Son datos de salud:
          conviene registrarlo antes de seguir usándolas.
        </p>
      )}

      {albums.map(album => (
        <article key={album.key} className="rounded-row bg-surface-soft p-4">
          <h3 className="mb-3 truncate text-body font-bold tracking-[-.01em]">{album.title}</h3>
          <div className="flex flex-col gap-3.5">
            {album.sessions.map(session => {
              const has = new Set(session.photos.map(item => item.kind));
              const caption = [
                session.session !== null ? `Sesión ${session.session}` : null,
                session.zone,
                dateLbl(session.takenAt),
              ].filter(Boolean).join(' · ');
              return (
                <div key={session.key}>
                  <p className="mb-2 text-micro font-semibold text-ink-3">{caption}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {session.photos.map(item => (
                      <PhotoCircle
                        key={item.id}
                        photo={item}
                        url={urls[item.storage_path]}
                        askId={askId}
                        pending={pending || photo.pending}
                        urlsReady={urlsReady}
                        onAsk={setAskId}
                        onCancel={() => setAskId(null)}
                        onDelete={remove}
                        onOpen={setOpenPhoto}
                      />
                    ))}
                    {(['before', 'after'] as const).filter(kind => !has.has(kind)).map(kind => {
                      const target: PhotoTarget = album.treatmentId
                        ? { treatmentId: album.treatmentId, kind, zone: session.zone, sessionNo: session.session }
                        : { clientId, kind, zone: session.zone, sessionNo: session.session };
                      const uploading = photo.pending && photo.busy === photoBusyKey(target);
                      return (
                        <div key={kind} className="flex min-w-0 flex-col items-center gap-1">
                          {uploading ? (
                            <p className="grid aspect-square w-full place-items-center rounded-row border border-dashed border-handle px-2 text-center text-micro font-semibold text-ink-2">
                              Subiendo…
                            </p>
                          ) : (
                            <PhotoPick
                              square
                              label={KIND_LABEL[kind].toLowerCase()}
                              disabled={pending || photo.pending}
                              onFile={addTo(album.treatmentId, session, kind)}
                            />
                          )}
                          <span className="text-micro font-bold uppercase tracking-[.03em] text-ink-2">
                            {KIND_LABEL[kind]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}

      {openPhoto && openUrl && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 p-4" role="dialog" aria-modal="true" aria-label="Foto">
          <button
            type="button"
            aria-label="Cerrar foto"
            onClick={() => setOpenPhoto(null)}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
          <img
            src={openUrl}
            alt={KIND_LABEL[openPhoto.kind]}
            className="max-h-[85vh] max-w-full rounded-row object-contain"
          />
        </div>
      )}
    </div>
  );
}
