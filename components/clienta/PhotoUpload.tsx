'use client';

import { useState, useTransition } from 'react';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addTreatmentPhoto } from '@/app/actions/treatments';
import { compressImage } from '@/hooks/compressImage';
import { Chip, inputCls } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import type { TreatmentRow } from '@/lib/types';

export default function PhotoUpload({ treatments }: { treatments: TreatmentRow[] }) {
  const open = treatments.filter(t => !t.closed_at);
  const options = open.length ? open : treatments.slice(0, 3);
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [treatmentId, setTreatmentId] = useState(options[0]?.id ?? '');
  const [kind, setKind] = useState<'before' | 'after'>('before');
  const [error, setError] = useState<string | null>(null);

  if (!options.length) return null;

  const chosen = treatments.find(t => t.id === treatmentId) ?? options[0];

  const onFile = (file: File | undefined) => {
    if (!file || !chosen) return;
    setError(null);
    startTransition(async () => {
      try {
        const blob = await compressImage(file);
        const path = `${chosen.id}/${kind}-${Date.now()}.jpg`;
        const sb = createClient();
        const { error: upErr } = await sb.storage.from('treatment-photos').upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (upErr) { setError(upErr.message); return; }
        const r = await addTreatmentPhoto({
          treatmentId: chosen.id,
          kind,
          zone: chosen.zone ?? undefined,
          sessionNo: chosen.sessions_done || undefined,
          storagePath: path,
        });
        if (!r.ok) setError(r.error ?? 'No se ha podido guardar');
        else toast('Foto guardada');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se ha podido subir');
      }
    });
  };

  return (
    <div className="mb-3 rounded-row border border-surface-line bg-white p-3.5 shadow-card">
      <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold">
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
      <div className="mb-2.5 flex gap-2">
        <Chip active={kind === 'before'} onClick={() => setKind('before')}>Antes</Chip>
        <Chip active={kind === 'after'} onClick={() => setKind('after')}>Después</Chip>
      </div>
      <label className="block">
        <span className="sr-only">Elegir foto</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={pending}
          onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ''; }}
          className="w-full text-[12.5px] font-semibold text-ink-2 file:mr-3 file:rounded-[11px] file:border-0 file:bg-grad file:px-3 file:py-2 file:text-[12.5px] file:font-bold file:text-white"
        />
      </label>
      {pending && <p className="mt-2 text-[12px] font-semibold text-ink-2">Comprimiendo y subiendo…</p>}
      {error && <p className="mt-2 text-[12px] font-semibold text-pink-700">{error}</p>}
    </div>
  );
}
