'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Eye, Loader2 } from 'lucide-react';
import { createSupportEntryUrl } from '@/app/actions/support-entry';
import { usePanelUI } from '@/context/PanelUIContext';
import type { Company } from '@/lib/types';

const APPTS = [
  { time: '9:30', client: 'Nerea Campos', svc: 'Facial radiance · Valeria', color: '#F4487F' },
  { time: '11:00', client: 'Lucía Ferrer', svc: 'Criolipólisis · Marco', color: '#8B5CF6' },
];

function supportReason(co: Company): { reason: string; showFix: boolean } {
  const pct = co.smsTotal ? co.smsLeft / co.smsTotal : 1;
  if (co.smsLeft === 0) {
    return { reason: 'Sin SMS · envíos cortados.', showFix: true };
  }
  if (pct < 0.15) {
    return { reason: `SMS al ${Math.round(pct * 100)} %.`, showFix: true };
  }
  return { reason: 'Sin incidencias abiertas.', showFix: false };
}

export default function SoporteView({ company }: { company: Company }) {
  const { openModal } = usePanelUI();
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const { reason, showFix } = supportReason(company);

  useEffect(() => {
    if (!company.live) return;
    let alive = true;
    setLoadingEntry(true);
    setEntryError(null);
    setIframeSrc(null);
    createSupportEntryUrl(company.id, '/agenda').then(r => {
      if (!alive) return;
      setLoadingEntry(false);
      if (r.ok) setIframeSrc(r.url);
      else setEntryError(r.error);
    });
    return () => { alive = false; };
  }, [company.id, company.live]);

  if (company.live) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden" data-no-pull>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-white px-3 py-2 lg:px-4">
          <p className="text-[13px] font-semibold text-brand-pink">App real · entrada automática</p>
          {iframeSrc && (
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill bg-ink px-3 text-[12px] font-semibold text-white"
            >
              <ExternalLink size={14} />
              Pestaña
            </a>
          )}
        </div>

        {entryError && (
          <p className="shrink-0 px-3 py-2 text-[13px] font-semibold text-[#991B1B]">{entryError}</p>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#f4f4f5]">
          {loadingEntry && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-[14px] text-ink-3">
              <Loader2 size={20} className="animate-spin" />
              Entrando…
            </div>
          )}
          {!loadingEntry && iframeSrc && (
            <iframe
              key={iframeSrc}
              title={`App de ${company.name}`}
              src={iframeSrc}
              className="absolute inset-0 h-full w-full border-0"
              allow="clipboard-read; clipboard-write"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-8">
      <p className="text-[13px] font-semibold text-brand-pink">Vista demo · {company.name}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-card bg-white p-5">
          <h2 className="pb-1.5 text-[14px] font-bold">Citas de hoy (mock)</h2>
          {APPTS.map(a => (
            <div key={a.time} className="flex gap-3.5 border-t border-line py-3">
              <span className="w-12 text-[14px] font-bold">{a.time}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">{a.client}</p>
                <p className="text-[13px] text-ink-2">{a.svc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-card bg-[#FFF7E6] px-5 py-4">
          <p className="text-[14px] text-[#8A5A00]">{reason}</p>
          {showFix && (
            <button
              type="button"
              onClick={() => openModal('bonusFor', { company: company.name, companyId: company.id })}
              className="mt-2 inline-flex h-9 items-center rounded-pill bg-ink px-3.5 text-[13px] font-semibold text-white"
            >
              Añadir bono
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-[14px] text-ink-2">
        <Eye className="mx-auto mb-2 text-ink-3" size={24} />
        Modo soporte con app real solo en empresas <strong>Live</strong>.
      </p>
    </div>
  );
}
