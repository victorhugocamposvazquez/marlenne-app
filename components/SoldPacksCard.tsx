'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/Toast';
import { packExpired, packIsOpen, packLabel } from '@/lib/packs';
import { addPackSessions } from '@/lib/pack-write';
import { createClient } from '@/lib/supabase/client';
import type { ClientPack } from '@/lib/types';

const TOP_UPS = [1, 4] as const;

export default function SoldPacksCard({
  packs, canEdit, className = 'mt-6',
}: {
  packs: ClientPack[];
  canEdit: boolean;
  className?: string;
}) {
  const open = packs.filter(p => packIsOpen(p));
  const closed = packs.filter(p => !packIsOpen(p));

  return (
    <section className={className}>
      <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">
        Bonos vendidos · {open.length} vivos
      </h2>
      <p className="mb-2.5 text-label font-medium text-ink-2">
        Recargar sesiones aquí. Vender uno nuevo, en la ficha. La clienta no entra a Marlén.
      </p>
      {packs.length === 0 ? (
        <EmptyState
          title="Todavía no hay ningún bono vendido"
          hint="Se venden en la ficha de la clienta."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {open.map(p => (
            <SoldRow key={p.id} pack={p} canEdit={canEdit} />
          ))}
          {closed.map(p => (
            <SoldRow key={p.id} pack={p} canEdit={canEdit} muted />
          ))}
        </div>
      )}
    </section>
  );
}

function SoldRow({ pack, canEdit, muted }: { pack: ClientPack; canEdit: boolean; muted?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const expired = packExpired(pack.expires_at);

  const add = (n: number) => {
    startTransition(async () => {
      const r = await addPackSessions(createClient(), pack.id, n);
      if (!r.ok) toast(r.error ?? 'No se ha podido recargar', 'err');
      else {
        toast(`+${n} en ${pack.name}`);
        router.refresh();
      }
    });
  };

  return (
    <article className={`rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card ${muted ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/clientas/${pack.owner_client_id}`} className="block truncate text-body font-bold">
            {pack.owner_name || 'Sin nombre'}
          </Link>
          <p className="mt-0.5 text-caption font-medium text-ink-3">
            {packLabel(pack)}
            {pack.friend_name ? ` · con ${pack.friend_name}` : ''}
            {expired ? ' · caducado' : ''}
          </p>
        </div>
        {pack.friend_client_id && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-badge bg-v-soft px-2 py-1 text-micro font-bold text-v-d">
            <Users size={11} strokeWidth={2.4} />
            Amigo
          </span>
        )}
      </div>
      {canEdit && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {TOP_UPS.map(n => (
            <Button
              key={n}
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => add(n)}
            >
              +{n}
            </Button>
          ))}
        </div>
      )}
    </article>
  );
}
