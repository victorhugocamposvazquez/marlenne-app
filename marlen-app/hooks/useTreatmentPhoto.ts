'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { addTreatmentPhoto, openTreatmentForPhotos } from '@/lib/agenda-write';
import { compressImage } from '@/hooks/compressImage';
import { useToast } from '@/components/Toast';
import { photoBusyKey, photoObjectPath, type PhotoTarget } from '@/lib/photos';

export function useTreatmentPhoto(onUploaded?: () => void) {
  const toast = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const upload = (file: File | undefined, target: PhotoTarget) => {
    if (!file || busy) return;
    if (!target.treatmentId && !(target.serviceId && target.clientId)) return;
    const key = photoBusyKey(target);
    setError(null);
    setBusy(key);
    void (async () => {
      let path = '';
      try {
        const blob = await compressImage(file);
        const sb = createClient();
        let treatmentId = target.treatmentId ?? undefined;
        if (!treatmentId && target.serviceId && target.clientId) {
          const opened = await openTreatmentForPhotos(sb, {
            clientId: target.clientId,
            serviceId: target.serviceId,
          });
          if (!opened.ok || !opened.id) {
            setError(opened.error ?? 'No se ha podido abrir el tratamiento');
            return;
          }
          treatmentId = opened.id;
        }
        if (!treatmentId) {
          setError('Elige un tratamiento');
          return;
        }
        path = photoObjectPath({ ...target, treatmentId }, Date.now());
        const { error: upErr } = await sb.storage.from('treatment-photos').upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (upErr) {
          setError(upErr.message);
          return;
        }
        const r = await addTreatmentPhoto(sb, {
          treatmentId,
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
        router.refresh();
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
