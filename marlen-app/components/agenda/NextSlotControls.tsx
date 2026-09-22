'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { nextFreeSlot } from '@/lib/confirm-link';
import { createClient } from '@/lib/supabase/client';

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

  const find = (any: boolean) => {
    startTransition(async () => {
      const slot = await nextFreeSlot(createClient(), {
        durationMin,
        providerId: any ? null : providerId,
        excludeId,
      });
      if (slot) onPick(slot);
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={pending || !durationMin}
        onClick={() => find(false)}
        className="inline-flex shrink-0 min-h-[44px] items-center gap-1.5 rounded-chip border border-v/25 bg-v-tint px-3 text-label font-bold text-v-d transition motion-safe:active:scale-[.97] disabled:opacity-40"
      >
        <Sparkles size={14} strokeWidth={2.2} />
        {pending ? 'Buscando…' : 'Próximo hueco'}
      </button>
      {anyProviders && (
        <button
          type="button"
          disabled={pending || !durationMin}
          onClick={() => find(true)}
          className="inline-flex shrink-0 min-h-[44px] items-center rounded-chip border border-surface-line bg-surface-card px-3 text-label font-bold text-ink-2 transition motion-safe:active:scale-[.97] disabled:opacity-40"
        >
          En cualquiera
        </button>
      )}
    </>
  );
}
