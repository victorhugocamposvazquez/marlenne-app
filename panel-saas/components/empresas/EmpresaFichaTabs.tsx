'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye } from 'lucide-react';
import ModalTrigger from '@/components/ui/ModalTrigger';
import StatusPill from '@/components/ui/StatusPill';
import { usePanelUI } from '@/context/PanelUIContext';
import { eur, initials } from '@/lib/format';
import LiveCenterCard from '@/components/sms/LiveCenterCard';
import type { LiveCenter } from '@/lib/live-center';
import { liveStaffRoleLabel, type LiveStaff } from '@/lib/live-staff';
import type { Company } from '@/lib/types';

const TABS = ['Resumen', 'SMS', 'Pagos', 'Su equipo', 'Ajustes'] as const;

export default function EmpresaFichaTabs({
  company,
  live = null,
  liveStaff = [],
}: {
  company: Company;
  live?: LiveCenter | null;
  liveStaff?: LiveStaff[];
}) {
  const { startImpersonation, toast } = usePanelUI();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Resumen');
  const [paused, setPaused] = useState(false);
  const pct = company.smsTotal ? Math.round((company.smsLeft / company.smsTotal) * 100) : 0;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-[14px] text-[14px] font-bold text-white" style={{ background: company.avatar }}>
            {initials(company.name)}
          </span>
          <div>
            <p className="text-[13px] text-ink-3">#{company.id}</p>
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <StatusPill status={company.status} />
              {company.live && (
                <span className="inline-flex items-center rounded-pill bg-[#E7F8EE] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#15803D]">
                  Live
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startImpersonation(company)}
            className="inline-flex h-11 items-center gap-2 rounded-pill bg-ink px-4 text-[13px] font-semibold text-white"
          >
            <Eye size={15} /> Entrar en su app (soporte)
          </button>
          <ModalTrigger
            kind="bonusFor"
            data={{ company: company.name, companyId: company.id }}
            className="h-11 rounded-pill border-[1.5px] border-line bg-white px-4 text-[13px] font-semibold"
          >
            + Bono de SMS
          </ModalTrigger>
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
          {company.live && liveStaff.length > 0 && (
            <div className="space-y-2 rounded-card border border-[#BBF7D0] bg-[#F0FDF4] p-5 lg:col-span-2">
              <h2 className="text-[16px] font-bold">App en producción</h2>
              <p className="text-[14px] text-ink-2">
                {liveStaff.filter(s => s.active).length} usuarios con acceso · datos reales de Supabase
              </p>
            </div>
          )}
          <div className="space-y-3 rounded-card bg-white p-5">
            <h2 className="text-[16px] font-bold">Suscripción</h2>
            <p className="text-[14px]"><span className="font-semibold">{company.plan}</span> · {eur(company.price)}/mes</p>
            <p className="text-[13px] text-ink-2">Próximo cobro: {company.next}</p>
            <div className="flex gap-2">
              <ModalTrigger
                kind="changePlan"
                data={{ company: company.name, plan: company.plan }}
                className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold"
              >
                Cambiar plan
              </ModalTrigger>
              <button
                type="button"
                onClick={() => { setPaused(p => { toast(p ? 'Suscripción reanudada' : 'Suscripción pausada'); return !p; }); }}
                className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold"
              >
                {paused ? 'Reanudar' : 'Pausar'}
              </button>
            </div>
          </div>
          <div className="space-y-3 rounded-card bg-white p-5">
            <h2 className="text-[16px] font-bold">SMS</h2>
            <p className="text-[14px] font-semibold">{company.smsLeft} restantes de {company.smsTotal}</p>
            <span className="block h-2 overflow-hidden rounded-pill bg-line"><span className="block h-full rounded-pill bg-brand-pink" style={{ width: `${pct}%` }} /></span>
            <p className="text-[13px] text-ink-2">Al agotar cupo se cortan envíos hasta bono o renovación.</p>
          </div>
          <div className="space-y-2 rounded-card bg-white p-5 lg:col-span-2">
            <h2 className="text-[16px] font-bold">Contacto</h2>
            <p className="text-[14px]">{company.contact}</p>
            <p className="text-[14px] text-ink-2">{company.email} · {company.phone}</p>
            <button type="button" onClick={() => toast('Editar contacto')} className="text-[13px] font-semibold text-brand-pink">Editar contacto</button>
            <Link href="#" className="block text-[13px] font-semibold text-brand-pink">Ver en Stripe ({company.stripe})</Link>
          </div>
          <div className="rounded-card bg-white p-5 lg:col-span-2">
            <h2 className="mb-2 text-[16px] font-bold">Uso de la app (30 días)</h2>
            <p className="text-[14px] text-ink-2">142 citas · 38 clientas nuevas · 89 % recordatorios enviados</p>
          </div>
        </div>
      )}

      {tab === 'SMS' && (
        company.live ? <LiveCenterCard center={live ?? null} /> : (
          <div className="space-y-2 rounded-card bg-white p-5">
            <p className="text-[14px]">Cupo {company.smsLeft}/{company.smsTotal} · remitente configurable por empresa</p>
            <p className="text-[13px] text-ink-2">Muestra. El historial real está en la empresa en producción.</p>
          </div>
        )
      )}

      {tab === 'Pagos' && (
        <div className="rounded-card bg-white p-5">
          <p className="text-[14px] font-semibold">{eur(company.price)}/mes · Stripe {company.stripe}</p>
          <p className="mt-2 text-[13px] text-ink-2">Historial de cobros e impagos desde el panel Pagos global.</p>
        </div>
      )}

      {tab === 'Su equipo' && (
        company.live ? (
          <div className="rounded-card bg-white px-5 py-1">
            {liveStaff.length === 0 ? (
              <p className="py-4 text-[14px] text-ink-2">No se ha podido leer el equipo de la app.</p>
            ) : liveStaff.map((m, i) => (
              <div key={m.id} className={`flex flex-wrap items-center gap-3 py-3.5 ${i ? 'border-t border-line' : ''}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-ink text-[12px] font-bold text-white">{initials(m.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{m.name}</p>
                  <p className="text-[13px] text-ink-2">
                    {liveStaffRoleLabel(m.role, m.jobTitle)}
                    {m.email ? ` · ${m.email}` : ' · sin acceso'}
                    {!m.active && ' · inactivo'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!m.email}
                  onClick={() => toast(m.email ? `Restablecer contraseña para ${m.email} (pendiente)` : 'Sin correo de acceso')}
                  className="h-8 rounded-pill border border-line px-3 text-[12px] font-semibold disabled:opacity-40"
                >
                  Restablecer contraseña
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card bg-white px-5 py-1">
            {[[company.contact, 'Propietaria', 'hoy 9:12', '#0F0E1A'], ['Valeria Ortega', 'Profesional', 'ayer', '#8B5CF6'], ['Marco Gil', 'Profesional', 'hace 3 días', '#4F6BF6']].slice(0, Math.max(1, Math.min(3, company.pros + 1))).map(([name, role, last, color], i) => (
              <div key={name} className={`flex flex-wrap items-center gap-3 py-3.5 ${i ? 'border-t border-line' : ''}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-pill text-[12px] font-bold text-white" style={{ background: color }}>{initials(name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{name}</p>
                  <p className="text-[13px] text-ink-2">{role} · último acceso {last}</p>
                </div>
                <button type="button" onClick={() => toast(`Correo de restablecimiento enviado a ${name}`)} className="h-8 rounded-pill border border-line px-3 text-[12px] font-semibold">
                  Restablecer contraseña
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'Ajustes' && (
        <div className="space-y-3">
          <div className="rounded-card bg-white px-5 py-1">
            {[
              ['Recordatorios por SMS', 'Se cortan al agotar el cupo', true],
              ['WhatsApp Business', 'Requiere número verificado', false],
              ['Reserva online para sus clientas', 'Página pública de citas', true],
              ['Ficha clínica', 'Historial por sesión', true],
              ['Acceso API', 'Solo plan Premium', false],
            ].map(([label, hint, on], i) => (
              <button key={label as string} type="button" onClick={() => toast(`${label} actualizado`)} className={`flex w-full items-center gap-3.5 py-4 text-left ${i ? 'border-t border-line' : ''}`}>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold">{label as string}</p>
                  <p className="text-[13px] text-ink-2">{hint as string}</p>
                </div>
                <span className={`relative h-[30px] w-[50px] shrink-0 rounded-pill ${on ? 'bg-ink' : 'bg-[#D9D8E0]'}`}>
                  <span className={`absolute top-0.5 h-6 w-6 rounded-pill bg-white shadow ${on ? 'left-[23px]' : 'left-[3px]'}`} />
                </span>
              </button>
            ))}
          </div>
          <div className="rounded-card bg-white p-5">
            <h2 className="mb-3 text-[15px] font-bold">Remitente de SMS</h2>
            <div className="flex flex-wrap items-center gap-2.5">
              <input defaultValue={company.name.split(' ').pop()?.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 11) || 'MARLEN'} className="h-[46px] w-[200px] rounded-[14px] bg-page px-3.5 text-[14px] font-semibold tracking-wide outline-none" />
              <span className="text-[13px] text-ink-2">Máx. 11 caracteres · aparece como remitente en el móvil de sus clientas</span>
            </div>
          </div>
          <button type="button" onClick={() => toast('Baja: pediría motivo, fecha de fin y confirmación')} className="text-[14px] font-semibold text-[#B3123B]">
            Dar de baja la empresa…
          </button>
        </div>
      )}
    </>
  );
}
