'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Eye, Loader2 } from 'lucide-react';
import { createSupportEntryUrl } from '@/app/actions/support-entry';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import { usePanelUI } from '@/context/PanelUIContext';
import type { Company } from '@/lib/types';

const APPTS = [
  { time: '9:30', client: 'Nerea Campos', svc: 'Facial radiance · Valeria', color: '#F4487F' },
  { time: '11:00', client: 'Lucía Ferrer', svc: 'Criolipólisis · Marco', color: '#8B5CF6' },
  { time: '13:30', client: 'Alba Santamaría', svc: 'Láser axilas · Marco', color: '#22B8E8' },
  { time: '17:00', client: 'Paula Nieto', svc: 'Facial · Valeria', color: '#F4487F' },
  { time: '18:00', client: 'Alba Torres', svc: 'Facial · Marco', color: '#F4487F' },
];

function supportReason(co: Company): { reason: string; showFix: boolean } {
  const pct = co.smsTotal ? co.smsLeft / co.smsTotal : 1;
  if (co.status === 'Impago') {
    return {
      reason: `Cobro de ${co.price} € fallido el ${co.next.replace('vencido ', '')}. Stripe reintenta los días 3 y 7; mientras, su app sigue activa.`,
      showFix: false,
    };
  }
  if (co.smsLeft === 0) {
    return {
      reason: 'Ticket · «No me llegan los recordatorios». Se ha quedado sin SMS: los envíos están cortados hasta que compre un bono o renueve.',
      showFix: true,
    };
  }
  if (pct < 0.15) {
    return {
      reason: `Le quedan ${co.smsLeft} SMS de ${co.smsTotal} (${Math.round(pct * 100)} %). Avisada al 80 %; candidata a bono.`,
      showFix: true,
    };
  }
  if (co.status === 'Prueba') {
    return { reason: `En periodo de prueba (${co.next}). Sin tarjeta añadida todavía.`, showFix: false };
  }
  return {
    reason: `Sin incidencias abiertas. ${co.smsLeft} de ${co.smsTotal} SMS disponibles, cobro al día.`,
    showFix: false,
  };
}

const APP_TABS = ['Agenda', 'Clientas', 'Ajustes'] as const;

function appPathForTab(tab: (typeof APP_TABS)[number]) {
  if (tab === 'Clientas') return '/clientas';
  if (tab === 'Ajustes') return '/ajustes';
  return '/agenda';
}

export default function SoporteView({ company }: { company: Company }) {
  const { openModal } = usePanelUI();
  const [tab, setTab] = useState<(typeof APP_TABS)[number]>('Agenda');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const { reason, showFix } = supportReason(company);

  useEffect(() => {
    if (!company.live) return;
    let alive = true;
    setLoadingEntry(true);
    setEntryError(null);
    setIframeSrc(null);
    createSupportEntryUrl(company.id, appPathForTab(tab)).then(r => {
      if (!alive) return;
      setLoadingEntry(false);
      if (r.ok) {
        setIframeSrc(r.url);
        setStaffName(r.staffName);
      } else {
        setEntryError(r.error);
      }
    });
    return () => { alive = false; };
  }, [company.id, company.live, tab]);

  if (company.live) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <p className="text-[13px] font-semibold text-brand-pink">App real · entrada automática</p>
            <p className="text-[15px] font-bold leading-snug text-ink-2">
              Ops entra con un enlace firmado (5 min, un solo uso). Ves la PWA igual que en el salón y puedes tocar citas y fichas.
            </p>
            {staffName && (
              <p className="mt-1 text-[13px] text-ink-3">
                Sesión como <strong>{staffName}</strong> (recepción/admin del centro). La franja amarilla avisa al equipo.
              </p>
            )}
          </div>
          <SegmentedTabs tabs={[...APP_TABS]} active={tab} onChange={t => setTab(t as (typeof APP_TABS)[number])} />
          {iframeSrc && (
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-pill border border-line bg-white px-3.5 text-[13px] font-semibold"
            >
              <ExternalLink size={15} />
              Abrir en pestaña
            </a>
          )}
        </div>

        {entryError && (
          <div className="rounded-card border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#991B1B]">
            {entryError}
          </div>
        )}

        <div className="flex min-h-[min(72vh,820px)] flex-1 flex-col overflow-hidden rounded-card border border-line bg-white shadow-sm">
          {loadingEntry && (
            <div className="flex flex-1 items-center justify-center gap-2 text-[14px] text-ink-3">
              <Loader2 size={20} className="animate-spin" />
              Preparando entrada segura…
            </div>
          )}
          {!loadingEntry && iframeSrc && (
            <iframe
              key={iframeSrc}
              title={`App de ${company.name}`}
              src={iframeSrc}
              className="h-full min-h-[480px] w-full flex-1 border-0"
              allow="clipboard-read; clipboard-write"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>

        <p className="text-[12px] leading-relaxed text-ink-3">
          Cada enlace y cada cambio relevante (citas, fichas) queda en el registro de soporte de la ficha Live. No hace falta tener sesión previa en Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-[200px] flex-1">
          <p className="text-[13px] font-semibold text-brand-pink">Vista demo · {company.name}</p>
          <p className="text-[24px] font-bold tracking-[-0.03em]">Agenda · muestra</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-card bg-white p-5">
          <h2 className="pb-1.5 text-[14px] font-bold">Sus citas de hoy (mock)</h2>
          {APPTS.map(a => (
            <div key={a.time} className="flex gap-3.5 border-t border-line py-3">
              <span className="w-12 text-[14px] font-bold">{a.time}</span>
              <span className="w-1 rounded-pill" style={{ background: a.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">{a.client}</p>
                <p className="text-[13px] text-ink-2">{a.svc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-card bg-[#FFF7E6] px-5 py-[18px]">
            <p className="text-[14px] font-bold text-[#8A5A00]">Por qué estás aquí</p>
            <p className="text-[14px] leading-relaxed text-[#8A5A00]">{reason}</p>
            {showFix && (
              <button
                type="button"
                onClick={() => openModal('bonusFor', { company: company.name, companyId: company.id })}
                className="mt-1 inline-flex h-9 items-center self-start rounded-pill bg-ink px-3.5 text-[13px] font-semibold text-white"
              >
                Añadir bono desde aquí
              </button>
            )}
          </div>
          <div className="rounded-card bg-white p-5">
            <p className="text-[14px] font-bold">Empresas Live</p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
              Solo Arlett (producción) abre la PWA real con login automático. El resto del catálogo sigue en mock.
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-card border border-dashed border-line bg-white p-8 text-center text-[14px] text-ink-2">
        <Eye className="mx-auto mb-3 text-ink-3" size={28} />
        Modo soporte embebido disponible en empresas <strong>Live</strong>.
      </div>
    </div>
  );
}
