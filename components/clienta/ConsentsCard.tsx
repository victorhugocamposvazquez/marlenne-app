'use client';

import { useTransition } from 'react';
import { ShieldCheck } from 'lucide-react';
import { addConsent } from '@/app/actions/clients';
import { CONSENT_KINDS, type ConsentKind } from '@/lib/consents';
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
      <div className="flex flex-col gap-2">
        {(Object.keys(CONSENT_KINDS) as ConsentKind[]).map(kind => {
          const row = latest.get(kind);
          return (
            <div key={kind} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink-2">
                {CONSENT_KINDS[kind]}
              </span>
              {row ? (
                <span className="text-[11px] font-bold text-emerald-700">
                  Firmado {dateLbl(row.signed_at)}
                </span>
              ) : canEdit ? (
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => { void addConsent({ clientId, kind }); })}
                  className="rounded-[10px] bg-v-soft px-2.5 py-1 text-[11px] font-bold text-v-d disabled:opacity-40"
                >
                  Registrar
                </button>
              ) : (
                <span className="text-[11px] font-bold text-ink-3">Pendiente</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
