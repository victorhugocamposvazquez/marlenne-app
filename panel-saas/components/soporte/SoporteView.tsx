'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
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

export default function SoporteView({ company }: { company: Company }) {
  const { openModal } = usePanelUI();
  const [tab, setTab] = useState('Agenda');
  const { reason, showFix } = supportReason(company);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-[200px] flex-1">
          <p className="text-[13px] font-semibold text-brand-pink">Estás viendo lo que ve {company.name}</p>
          <p className="text-[24px] font-bold tracking-[-0.03em]">{tab} · Lunes 21</p>
        </div>
        <SegmentedTabs tabs={['Agenda', 'Clientas', 'Servicios', 'Ajustes']} active={tab} onChange={setTab} />
      </div>

      {tab === 'Agenda' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-card bg-white p-5">
            <h2 className="pb-1.5 text-[14px] font-bold">Sus citas de hoy</h2>
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
              <p className="text-[14px] font-bold">Lo que puedes hacer en modo soporte</p>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
                Ver su agenda, clientas y ajustes tal cual los ve ella. Puedes corregir configuración y reenviar SMS. No puedes ver fichas clínicas ni cobrarle: para eso vuelve al panel. Cada acción queda en su registro de actividad con tu nombre.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-line bg-white p-10 text-center text-[14px] text-ink-2">
          <Eye className="mx-auto mb-3 text-ink-3" size={28} />
          Vista <strong>{tab}</strong> de la app de {company.name} · mock embebido según handoff.
        </div>
      )}
    </div>
  );
}
