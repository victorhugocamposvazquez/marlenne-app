'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { addTreatmentPhoto } from '@/lib/agenda-write';
import { compressImage } from '@/hooks/compressImage';
import { useToast } from '@/components/Toast';
import { photoBusyKey, type PhotoTarget } from '@/lib/photos';

export function useTreatmentPhoto(onUploaded?: () => void) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const upload = (file: File | undefined, target: PhotoTarget) => {
    if (!file || !target.treatmentId) return;
    const key = photoBusyKey(target);
    setError(null);
    setBusy(key);
    startTransition(async () => {
      try {
        const blob = await compressImage(file);
        const path = `${target.treatmentId}/${target.kind}-${Date.now()}.jpg`;
        const sb = createClient();
        const { error: upErr } = await sb.storage.from('treatment-photos').upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (upErr) {
          setError(upErr.message);
          return;
        }
        const r = await addTreatmentPhoto(sb, {
          treatmentId: target.treatmentId,
          kind: target.kind,
          zone: target.zone ?? undefined,
          sessionNo: target.sessionNo ?? undefined,
          storagePath: path,
        });
        if (!r.ok) setError(r.error ?? 'No se ha podido guardar');
        else {
          toast('Foto guardada');
          router.refresh();
          onUploaded?.();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se ha podido subir');
      } finally {
        setBusy(null);
      }
    });
  };

  return { pending, busy, error, upload };
}
