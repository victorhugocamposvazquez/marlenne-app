'use client';

import { useState } from 'react';
import SegmentedTabs from '@/components/ui/SegmentedTabs';

const TABS = ['Suscripciones', 'SMS', 'Pagos', 'Integraciones', 'Seguridad'] as const;

export default function AjustesSaasView() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Suscripciones');
  const [dirty, setDirty] = useState(false);

  return (
    <div className="space-y-5">
      <SegmentedTabs tabs={[...TABS]} active={tab} onChange={t => setTab(t as typeof tab)} />

      {tab === 'Suscripciones' && (
        <div className="space-y-3">
          <Section title="Prueba gratuita">
            <Toggle label="Activar prueba" on hint="Auto-registro desde la web sin tarjeta" />
            <Field label="Duración" value="14" unit="días" hint="Aviso a la empresa 3 días antes" />
            <Field label="SMS incluidos en la prueba" value="50" unit="SMS" />
          </Section>
          <Section title="Cobros y fiscalidad">
            <Field label="Días de gracia tras impago" value="3" unit="días" />
            <Field label="IVA" value="21" unit="%" />
            <Readonly label="Moneda" value="EUR" />
            <Readonly label="Serie de factura" value="M-2026-" hint="Correlativa, no editable" />
          </Section>
        </div>
      )}

      {tab === 'SMS' && (
        <div className="space-y-3">
          <Section title="Proveedor principal · Twilio" status="Degradado · p95 41 s" statusColor="#F59E0B">
            <Readonly label="Cuenta" value="AC7f…e21" />
            <Secret label="Token de API" />
            <Field label="Ritmo máximo de salida" value="410" unit="SMS/min" />
            <Toggle label="Respaldo automático" on hint="Cambia a Vonage si p95 > 60 s durante 5 min" />
          </Section>
          <Section title="Reglas de cupo">
            <Toggle label="Cortar envíos al agotar el cupo" on />
            <Toggle label="Avisar al 80 %" on />
            <Field label="Umbral de aviso" value="80" unit="%" />
            <Field label="Remitente por defecto" value="Marlen" />
          </Section>
        </div>
      )}

      {tab === 'Pagos' && (
        <div className="space-y-3">
          <Section title="Stripe" status="Operativo" statusColor="#22C55E">
            <Readonly label="Cuenta" value="acct_1Kx…9Q" hint="Modo producción" />
            <Secret label="Clave secreta" />
            <Secret label="Secreto del webhook" hint="Endpoint /webhooks/stripe" />
            <Readonly label="Último webhook" value="hace 2 min" />
          </Section>
          <Section title="Recuperación de impagos">
            <Field label="Reintentos de cobro" value="2" />
            <Field label="Días de reintento" value="3, 7" />
            <Readonly label="Al agotar reintentos" value="Pausar cuenta" />
          </Section>
        </div>
      )}

      {tab === 'Integraciones' && (
        <div className="space-y-3">
          <Section title="WhatsApp Business · Meta" status="Operativo" statusColor="#22C55E">
            <Readonly label="Número verificado" value="+34 600 00 00 00" />
            <Secret label="Token permanente" />
            <Toggle label="Plantilla «recordatorio_cita» aprobada" on hint="Estado en Meta: aprobada" />
            <button type="button" onClick={() => setDirty(true)} className="rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold">Enviar mensaje de prueba</button>
          </Section>
          <Section title="Correo transaccional · Resend" status="Operativo" statusColor="#22C55E">
            <Readonly label="Dominio" value="mail.marlen.app" hint="SPF, DKIM y DMARC correctos" />
            <Secret label="Clave de API" />
            <Readonly label="Rebotes 30 días" value="0,2 %" />
            <button type="button" onClick={() => setDirty(true)} className="rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold">Enviar correo de prueba</button>
          </Section>
        </div>
      )}

      {tab === 'Seguridad' && (
        <div className="space-y-3">
          <Section title="Acceso al panel">
            <Toggle label="Verificación en dos pasos obligatoria" on hint="Para todo el equipo" />
            <Field label="Caducidad de sesión" value="12" unit="horas" />
            <Field label="Retención de registros" value="24" unit="meses" hint="Actividad, accesos y modo soporte" />
          </Section>
          <Section title="Infraestructura" status="Última copia 4:00" statusColor="#22C55E">
            <Field label="Hora de la copia diaria" value="4:00" hint="Última copia hoy · 2,1 GB" />
            <Field label="Copias conservadas" value="30" unit="días" />
            <Toggle label="Modo mantenimiento" hint="Muestra aviso a todas las empresas y bloquea escrituras" />
            <button type="button" onClick={() => setDirty(true)} className="rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold">Lanzar copia ahora</button>
          </Section>
        </div>
      )}

      <div className="sticky bottom-0 flex justify-end gap-2 rounded-card border border-line bg-white p-4 shadow-menu">
        <button type="button" disabled={!dirty} className="rounded-pill border border-line px-4 py-2 text-[13px] font-semibold disabled:opacity-40" onClick={() => setDirty(false)}>
          Descartar
        </button>
        <button
          type="button"
          disabled={!dirty}
          className="rounded-pill bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
          onClick={() => setDirty(false)}
        >
          Guardar cambios
        </button>
        <button type="button" className="ml-2 text-[12px] text-brand-pink underline" onClick={() => setDirty(true)}>Simular cambio (demo)</button>
      </div>
    </div>
  );
}

function Section({ title, status, statusColor, children }: { title: string; status?: string; statusColor?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold">{title}</h2>
        {status && <span className="text-[13px] font-semibold" style={{ color: statusColor }}>{status}</span>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      {hint && <span className="ml-2 text-[12px] text-ink-3">{hint}</span>}
      <div className="mt-2 flex gap-2">
        <input defaultValue={value} className="h-11 flex-1 rounded-field bg-page px-4 text-[15px] font-semibold outline-none ring-brand-pink focus:ring-2" />
        {unit && <span className="flex h-11 items-center rounded-field bg-page px-3 text-[13px] font-semibold text-ink-2">{unit}</span>}
      </div>
    </label>
  );
}

function Readonly({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      {hint && <span className="ml-2 text-[12px] text-ink-3">{hint}</span>}
      <p className="mt-2 text-[15px] font-semibold">{value}</p>
    </div>
  );
}

function Secret({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <span className="text-[13px] font-semibold text-ink-2">{label}</span>
        {hint && <p className="text-[12px] text-ink-3">{hint}</p>}
        <p className="mt-2 font-mono text-[14px]">••••••••3f9a</p>
      </div>
      <button type="button" className="rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold">Rotar</button>
    </div>
  );
}

function Toggle({ label, on, hint }: { label: string; on?: boolean; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[14px] font-semibold">{label}</p>
        {hint && <p className="text-[12px] text-ink-3">{hint}</p>}
      </div>
      <span className={`relative h-7 w-12 shrink-0 rounded-pill ${on ? 'bg-ok' : 'bg-line'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-pill bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </div>
  );
}
