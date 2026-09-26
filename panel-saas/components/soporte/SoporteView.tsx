'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Eye } from 'lucide-react';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import { usePanelUI } from '@/context/PanelUIContext';
import { supportAppPath } from '@/lib/marlen-app-url';
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
  const { openModal, panelUser } = usePanelUI();
  const [tab, setTab] = useState<(typeof APP_TABS)[number]>('Agenda');
  const { reason, showFix } = supportReason(company);

  const opsEmail = panelUser?.email ?? 'ops@marlen.com';
  const liveEmbed = company.live;

  const iframeSrc = useMemo(() => {
    if (!liveEmbed) return null;
    return supportAppPath(company.name, opsEmail, appPathForTab(tab));
  }, [liveEmbed, company.name, opsEmail, tab]);

  if (liveEmbed && iframeSrc) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <p className="text-[13px] font-semibold text-brand-pink">App real · {company.name}</p>
            <p className="text-[15px] font-bold text-ink-2">
              Misma PWA que en el salón. Consume lo mismo que abrirla en Safari; no duplica datos.
            </p>
          </div>
          <SegmentedTabs tabs={[...APP_TABS]} active={tab} onChange={t => setTab(t as (typeof APP_TABS)[number])} />
          <a
            href={iframeSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-pill border border-line bg-white px-3.5 text-[13px] font-semibold"
          >
            <ExternalLink size={15} />
            Abrir en pestaña
          </a>
        </div>

        <div className="flex min-h-[min(72vh,820px)] flex-1 flex-col overflow-hidden rounded-card border border-line bg-white shadow-sm">
          <iframe
            title={`App de ${company.name}`}
            src={iframeSrc}
            className="h-full min-h-[480px] w-full flex-1 border-0"
            allow="clipboard-read; clipboard-write"
          />
        </div>

        <p className="text-[12px] leading-relaxed text-ink-3">
          Debes tener sesión en la app en este navegador (misma cuenta de staff). La franja amarilla en la PWA avisa al equipo de que Ops está dentro. Si el iframe no carga el login, usa «Abrir en pestaña».
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
              Solo Arlett (producción) abre la PWA real aquí. El resto del catálogo sigue en mock hasta que haya centro en prod.
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
