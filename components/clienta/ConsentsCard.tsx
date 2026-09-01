'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import { addConsent } from '@/lib/client-write';
import { createClient } from '@/lib/supabase/client';
import { CONSENT_COPY, CONSENT_KINDS, consentExpired, latestConsents, type ConsentKind } from '@/lib/consents';
import { dateLbl } from '@/lib/time';
import type { Consent } from '@/lib/types';

export default function ConsentsCard({
  clientId, consents, canEdit,
}: {
  clientId: string;
  consents: Consent[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [ask, setAsk] = useState<ConsentKind | null>(null);
  const router = useRouter();
  const latest = latestConsents(consents);

  return (
    <section className="mt-3 rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
      <div className="mb-2.5 flex items-center gap-2 text-body font-bold">
        <ShieldCheck size={16} strokeWidth={2.2} className="text-v" />
        Consentimientos
      </div>
      <p className="mb-2.5 text-caption font-medium leading-snug text-ink-2">
        Se registra que la clienta lo ha consentido en persona. No sustituye el documento en papel si el centro lo usa.
      </p>
      <div className="flex flex-col gap-2">
        {(Object.keys(CONSENT_KINDS) as ConsentKind[]).map(kind => {
          const row = latest.get(kind);
          const expired = consentExpired(row);
          return (
            <div key={kind} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-label font-semibold text-ink-2">
                {CONSENT_KINDS[kind]}
              </span>
              {row && !expired ? (
                <span className="text-caption font-bold text-ok-fg">
                  {dateLbl(row.signed_at)}
                  {row.expires_at ? ` · hasta ${dateLbl(row.expires_at)}` : ''}
                </span>
              ) : canEdit ? (
                <button
                  disabled={pending}
                  onClick={() => setAsk(kind)}
                  className="min-h-[44px] rounded-chip bg-v-soft px-3 text-label font-bold text-v-d disabled:opacity-40"
                >
                  {expired ? 'Renovar' : 'Registrar'}
                </button>
              ) : (
                <span className="text-caption font-bold text-ink-3">{expired ? 'Caducado' : 'Pendiente'}</span>
              )}
            </div>
          );
        })}
      </div>

      {ask && (
        <div className="mt-3 rounded-icon border border-v/30 bg-v-tint p-3">
          <p className="text-body font-bold text-v-d">{CONSENT_KINDS[ask]}</p>
          <p className="mt-1.5 text-label font-medium leading-snug text-ink-2">{CONSENT_COPY[ask]}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1 text-ink-2" onClick={() => setAsk(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={pending}
              onClick={() => startTransition(async () => {
                const r = await addConsent(createClient(), { clientId, kind: ask });
                if (r.ok) {
                  setAsk(null);
                  router.refresh();
                }
              })}
            >
              Lo ha consentido
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
