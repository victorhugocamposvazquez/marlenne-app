'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addTreatmentPhoto, openTreatmentForPhotos } from '@/lib/agenda-write';
import { compressImage } from '@/hooks/compressImage';
import { useToast } from '@/components/Toast';
import { photoBusyKey, photoObjectPath, type PhotoTarget } from '@/lib/photos';

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(msg)), ms);
    p.then(
      v => { clearTimeout(t); resolve(v); },
      e => { clearTimeout(t); reject(e); },
    );
  });
}

export function useTreatmentPhoto(onUploaded?: () => void) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const upload = (file: File | undefined, target: PhotoTarget) => {
    if (!file || busy) return;
    const can =
      !!target.treatmentId
      || !!(target.serviceId && target.clientId)
      || !!target.clientId;
    if (!can) return;

    const key = photoBusyKey(target);
    setError(null);
    setBusy(key);
    void (async () => {
      let path = '';
      try {
        let blob: Blob;
        try {
          blob = await withTimeout(compressImage(file), 25_000, 'La foto tardó demasiado en prepararse');
        } catch (compErr) {
          if (file.type.startsWith('image/') && file.size > 0 && file.size < 12_000_000) {
            blob = file;
          } else {
            throw compErr;
          }
        }

        const sb = createClient();
        let treatmentId = target.treatmentId ?? undefined;
        if (!treatmentId && target.serviceId && target.clientId) {
          const opened = await withTimeout(
            openTreatmentForPhotos(sb, { clientId: target.clientId, serviceId: target.serviceId }),
            20_000,
            'No responde el servidor',
          );
          if (!opened.ok || !opened.id) {
            setError(opened.error ?? 'No se ha podido abrir el tratamiento');
            return;
          }
          treatmentId = opened.id;
        }

        const clientOnly = !treatmentId && !!target.clientId;
        if (!treatmentId && !clientOnly) {
          setError('Elige un tratamiento');
          return;
        }

        path = photoObjectPath({ ...target, treatmentId: treatmentId ?? null }, Date.now());
        if (!path) {
          setError('No se ha podido preparar la ruta');
          return;
        }

        const { error: upErr } = await withTimeout(
          sb.storage.from('treatment-photos').upload(path, blob, {
            contentType: blob.type === 'image/jpeg' || blob.type === 'image/jpg' ? 'image/jpeg' : 'image/jpeg',
            upsert: false,
          }),
          45_000,
          'La subida tardó demasiado',
        );
        if (upErr) {
          setError(upErr.message);
          return;
        }

        const r = await addTreatmentPhoto(sb, {
          treatmentId: treatmentId ?? undefined,
          clientId: clientOnly ? target.clientId ?? undefined : undefined,
          kind: target.kind,
          zone: target.zone ?? undefined,
          sessionNo: target.sessionNo ?? undefined,
          storagePath: path,
        });
        if (!r.ok) {
          await sb.storage.from('treatment-photos').remove([path]);
          setError(r.error ?? 'No se ha podido guardar');
          return;
        }
        toast('Foto guardada');
        onUploaded?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se ha podido subir');
      } finally {
        setBusy(null);
      }
    })();
  };

  return { pending: busy !== null, busy, error, upload };
}