'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { nextFreeSlot } from '@/lib/confirm-link';
import { createClient } from '@/lib/supabase/client';
import { shortWhen } from '@/lib/time';

export type PickedSlot = { providerId: string; startsAt: string };

export default function NextSlotControls({
  durationMin, providerId, anyProviders = false, excludeId, onPick,
}: {
  durationMin: number;
  providerId: string | null;
  anyProviders?: boolean;
  excludeId?: string;
  onPick: (slot: PickedSlot) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState<PickedSlot | null>(null);
  const [empty, setEmpty] = useState(false);

  const find = (any: boolean) => {
    setEmpty(false);
    startTransition(async () => {
      const slot = await nextFreeSlot(createClient(), {
        durationMin,
        providerId: any ? null : providerId,
        excludeId,
      });
      if (!slot) { setHint(null); setEmpty(true); return; }
      setHint(slot);
      onPick(slot);
    });
  };

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !durationMin}
          onClick={() => find(false)}
          className="inline-flex items-center gap-1.5 rounded-[12px] border border-v/25 bg-v-tint px-3 py-2 text-[12.5px] font-bold text-v-d disabled:opacity-40"
        >
          <Sparkles size={14} strokeWidth={2.2} />
          {pending ? 'Buscando…' : 'Próximo hueco'}
        </button>
        {anyProviders && (
          <button
            type="button"
            disabled={pending || !durationMin}
            onClick={() => find(true)}
            className="inline-flex items-center rounded-[12px] border border-surface-line bg-white px-3 py-2 text-[12.5px] font-bold text-ink-2 disabled:opacity-40"
          >
            En cualquiera
          </button>
        )}
      </div>
      {hint && (
        <p className="mt-1.5 text-[11.5px] font-semibold text-ink-2">
          Hueco {shortWhen(hint.startsAt)}
        </p>
      )}
      {empty && (
        <p className="mt-1.5 text-[11.5px] font-semibold text-ink-3">
          No queda hueco en los próximos 7 días.
        </p>
      )}
    </div>
  );
}
