'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { addConsent } from '@/lib/client-write';
import { createClient } from '@/lib/supabase/client';
import { CONSENT_COPY, CONSENT_KINDS, type ConsentKind } from '@/lib/consents';
import { dateLbl, dayKey } from '@/lib/time';
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
  const latest = new Map<string, Consent>();
  for (const c of consents) {
    const prev = latest.get(c.kind);
    if (!prev || +new Date(c.signed_at) > +new Date(prev.signed_at)) latest.set(c.kind, c);
  }

  return (
    <section className="mt-3 rounded-row border border-surface-line bg-white p-3.5 shadow-card">
      <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold">
        <ShieldCheck size={16} strokeWidth={2.2} className="text-v" />
        Consentimientos
      </div>
      <p className="mb-2.5 text-[11.5px] font-medium leading-snug text-ink-3">
        Se registra que la clienta lo ha consentido en persona. No sustituye el documento en papel si el centro lo usa.
      </p>
      <div className="flex flex-col gap-2">
        {(Object.keys(CONSENT_KINDS) as ConsentKind[]).map(kind => {
          const row = latest.get(kind);
          const expired = row?.expires_at ? row.expires_at < dayKey(new Date()) : false;
          return (
            <div key={kind} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink-2">
                {CONSENT_KINDS[kind]}
              </span>
              {row && !expired ? (
                <span className="text-[11px] font-bold text-emerald-700">
                  {dateLbl(row.signed_at)}
                  {row.expires_at ? ` · hasta ${dateLbl(row.expires_at)}` : ''}
                </span>
              ) : canEdit ? (
                <button
                  disabled={pending}
                  onClick={() => setAsk(kind)}
                  className="rounded-[10px] bg-v-soft px-2.5 py-1 text-[11px] font-bold text-v-d disabled:opacity-40"
                >
                  {expired ? 'Renovar' : 'Registrar'}
                </button>
              ) : (
                <span className="text-[11px] font-bold text-ink-3">{expired ? 'Caducado' : 'Pendiente'}</span>
              )}
            </div>
          );
        })}
      </div>

      {ask && (
        <div className="mt-3 rounded-[14px] border border-v/30 bg-v-tint p-3">
          <p className="text-[13px] font-bold text-v-d">{CONSENT_KINDS[ask]}</p>
          <p className="mt-1.5 text-[12px] font-medium leading-snug text-ink-2">{CONSENT_COPY[ask]}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setAsk(null)}
              className="flex-1 rounded-field border border-surface-line bg-white py-2 text-[12.5px] font-bold text-ink-2"
            >
              Cancelar
            </button>
            <button
              disabled={pending}
              onClick={() => startTransition(async () => {
                const r = await addConsent(createClient(), { clientId, kind: ask });
                if (r.ok) {
                  setAsk(null);
                  router.refresh();
                }
              })}
              className="flex-1 rounded-field bg-grad py-2 text-[12.5px] font-extrabold text-white disabled:opacity-40"
            >
              Lo ha consentido
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
