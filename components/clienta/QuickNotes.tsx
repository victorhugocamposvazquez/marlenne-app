'use client';

import { useEffect, useState } from 'react';
import AutoGrowTextarea from '@/components/AutoGrowTextarea';
import { patchClientNotes } from '@/lib/client-write';
import { createClient } from '@/lib/supabase/client';
import { inputCls } from '@/components/Sheet';

export default function QuickNotes({
  clientId, notes, canEdit,
}: {
  clientId: string;
  notes: string | null;
  canEdit: boolean;
}) {
  const [value, setValue] = useState(notes ?? '');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setValue(notes ?? ''); }, [notes]);

  if (!canEdit && !notes) return null;

  if (!canEdit) {
    return (
      <p className="mt-2.5 rounded-chip border border-surface-line bg-v-tint px-3 py-2 text-label font-medium leading-snug text-ink-2">
        {notes}
      </p>
    );
  }

  return (
    <div className="mt-2.5">
      <div className="mb-1 text-micro font-bold uppercase tracking-[.03em] text-ink-3">Notas internas</div>
      <AutoGrowTextarea
        className={`${inputCls} resize-none`}
        placeholder="Alergias, prefiere tardes, viene con…"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => {
          if (value.trim() === (notes ?? '').trim()) return;
          setErr(null);
          void patchClientNotes(createClient(), clientId, value).then(r => {
            if (!r.ok) setErr(r.error ?? 'No se ha podido guardar');
          });
        }}
      />
      {err && <p className="mt-1 text-caption font-semibold text-danger-fg">{err}</p>}
    </div>
  );
}
