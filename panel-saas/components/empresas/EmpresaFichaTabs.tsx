'use client';

import Link from 'next/link';
import { useState } from 'react';
import StatusPill from '@/components/ui/StatusPill';
import { eur, initials } from '@/lib/format';
import type { Company } from '@/lib/types';

const TABS = ['Resumen', 'SMS', 'Pagos', 'Su equipo', 'Ajustes'] as const;

export default function EmpresaFichaTabs({ company }: { company: Company }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Resumen');
  const pct = company.smsTotal ? Math.round((company.smsLeft / company.smsTotal) * 100) : 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-[14px] text-[14px] font-bold text-white" style={{ background: company.avatar }}>
            {initials(company.name)}
          </span>
          <div>
            <p className="text-[13px] text-ink-3">#{company.id}</p>
            <StatusPill status={company.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${appUrl.replace(/\/$/, '')}?soporte=demo-${company.id}`} className="inline-flex h-11 items-center rounded-pill bg-ink px-4 text-[13px] font-semibold text-white">
            Entrar en su app (soporte)
          </a>
          <button type="button" className="h-11 rounded-pill border-[1.5px] border-line bg-white px-4 text-[13px] font-semibold">+ Bono de SMS</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-pill bg-white p-1">
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`shrink-0 rounded-pill px-4 py-2 text-[13px] font-semibold ${tab === t ? 'bg-ink text-white' : 'text-ink-2'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Resumen' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-card space-y-3 bg-white p-5">
            <h2 className="text-[16px] font-bold">Suscripción</h2>
            <p className="text-[14px]"><span className="font-semibold">{company.plan}</span> · {eur(company.price)}/mes</p>
            <p className="text-[13px] text-ink-2">Próximo cobro: {company.next}</p>
            <div className="flex gap-2">
              <button type="button" className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold">Cambiar plan</button>
              <button type="button" className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold">Pausar</button>
            </div>
          </div>
          <div className="rounded-card space-y-3 bg-white p-5">
            <h2 className="text-[16px] font-bold">SMS</h2>
            <p className="text-[14px] font-semibold">{company.smsLeft} restantes de {company.smsTotal}</p>
            <span className="block h-2 overflow-hidden rounded-pill bg-line"><span className="block h-full rounded-pill bg-brand-pink" style={{ width: `${pct}%` }} /></span>
            <p className="text-[13px] text-ink-2">Al agotar cupo se cortan envíos hasta bono o renovación.</p>
          </div>
          <div className="rounded-card space-y-2 bg-white p-5 lg:col-span-2">
            <h2 className="text-[16px] font-bold">Contacto</h2>
            <p className="text-[14px]">{company.contact}</p>
            <p className="text-[14px] text-ink-2">{company.email} · {company.phone}</p>
            <Link href="#" className="text-[13px] font-semibold text-brand-pink">Ver en Stripe ({company.stripe})</Link>
          </div>
          <div className="rounded-card bg-white p-5 lg:col-span-2">
            <h2 className="mb-2 text-[16px] font-bold">Uso de la app (30 días)</h2>
            <p className="text-[14px] text-ink-2">142 citas · 38 clientas nuevas · 89 % recordatorios enviados</p>
          </div>
        </div>
      )}

      {tab === 'SMS' && (
        <div className="rounded-card bg-white p-5 space-y-2">
          <p className="text-[14px]">Cupo {company.smsLeft}/{company.smsTotal} · remitente configurable por empresa</p>
          <p className="text-[13px] text-ink-2">Últimos 15 envíos mock · conectar a sms_log en fase BD.</p>
        </div>
      )}

      {tab === 'Pagos' && (
        <div className="rounded-card bg-white p-5">
          <p className="text-[14px] font-semibold">{eur(company.price)}/mes · Stripe {company.stripe}</p>
          <p className="mt-2 text-[13px] text-ink-2">Historial de cobros e impagos desde el panel Pagos global.</p>
        </div>
      )}

      {(tab === 'Su equipo' || tab === 'Ajustes') && (
        <div className="rounded-card border border-dashed border-line bg-white p-8 text-center text-[14px] text-ink-2">
          Pestaña <strong>{tab}</strong> según handoff · mock ampliado en siguiente iteración.
        </div>
      )}
    </>
  );
}
