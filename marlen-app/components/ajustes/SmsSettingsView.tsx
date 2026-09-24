'use client';

import { useState, useTransition } from 'react';
import { saveSmsConfig, saveSmsTemplate, sendTestReminder } from '@/app/actions/sms-settings';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import { TZ } from '@/lib/time';

type SmsConfig = {
  enabled: boolean;
  reminder_mode: 'hours_before' | 'day_before_at_hour';
  reminder_hours_before: number;
  reminder_send_hour: number;
  test_mode: boolean;
  sender: string;
};

type SmsLogRow = {
  id: string;
  status: string;
  to_phone: string;
  body: string;
  sent_at: string | null;
  created_at: string;
  simulated: boolean;
  delivered_at: string | null;
  error_message: string | null;
  origin: string;
};

type TestAppt = { id: string; label: string };

const when = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

function ToggleRow({
  title, hint, on, disabled, onToggle,
}: {
  title: string;
  hint: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className="flex min-h-[52px] w-full items-center gap-3 border-b border-surface-line py-4 text-left last:border-0 disabled:opacity-45"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body-lg font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-body leading-snug text-ink-2">{hint}</span>
      </span>
      <span className={`h-7 w-12 shrink-0 rounded-full p-0.5 ${on ? 'bg-v-2' : 'bg-surface-line'}`}>
        <span className={`block h-6 w-6 rounded-full bg-surface-card shadow ${on ? 'ml-5' : ''}`} />
      </span>
    </button>
  );
}

function statusChip(status: string) {
  if (status === 'sent') return 'bg-ok-bg text-ok-fg';
  if (status === 'failed') return 'bg-danger-bg text-danger-fg';
  return 'bg-surface-bg text-ink-2';
}

export default function SmsSettingsView({
  config, templateBody, logs, testAppointments,
}: {
  config: SmsConfig;
  templateBody: string;
  logs: SmsLogRow[];
  testAppointments: TestAppt[];
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [cfg, setCfg] = useState(config);
  const [cuerpo, setCuerpo] = useState(templateBody);
  const [testApptId, setTestApptId] = useState(testAppointments[0]?.id ?? '');

  const saveConfig = () => {
    startTransition(async () => {
      const r = await saveSmsConfig(cfg);
      if (!r.ok) toast(r.error ?? 'No se ha podido guardar', 'err');
      else toast('Configuración guardada');
    });
  };

  const saveTemplate = () => {
    startTransition(async () => {
      const r = await saveSmsTemplate(cuerpo);
      if (!r.ok) toast(r.error ?? 'No se ha podido guardar', 'err');
      else toast('Plantilla guardada');
    });
  };

  const sendTest = () => {
    if (!testApptId) {
      toast('Elige una cita de prueba', 'err');
      return;
    }
    startTransition(async () => {
      const r = await sendTestReminder(testApptId);
      if (!r.ok) toast(r.error ?? 'No se ha podido enviar', 'err');
      else toast(cfg.test_mode ? 'SMS simulado registrado' : 'SMS de prueba en cola');
    });
  };

  return (
    <AjustesHeader title="SMS">
      <p className="text-body leading-snug text-ink-2">
        Recordatorios automáticos por SMS. En modo prueba no se envía al operador real.
      </p>

      <AjustesSection title="Recordatorios">
        <ToggleRow
          title="SMS activos"
          hint="Apaga todos los recordatorios del centro."
          on={cfg.enabled}
          disabled={pending}
          onToggle={() => setCfg(c => ({ ...c, enabled: !c.enabled }))}
        />
        <ToggleRow
          title="Modo prueba"
          hint="Simula el envío: se registra en el log pero no sale al móvil."
          on={cfg.test_mode}
          disabled={pending}
          onToggle={() => setCfg(c => ({ ...c, test_mode: !c.test_mode }))}
        />
        <label className="block border-b border-surface-line py-4">
          <span className="block text-body-lg font-bold text-ink">Remitente de este centro</span>
          <span className="mt-0.5 block text-body leading-snug text-ink-2">
            El identificador de LabsMobile de este centro. Cada centro tiene el suyo.
          </span>
          <input
            className={`${inputCls} mt-3 uppercase`}
            value={cfg.sender}
            disabled={pending}
            maxLength={12}
            autoCapitalize="characters"
            onChange={e => setCfg(c => ({ ...c, sender: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
          />
        </label>
        <div className="border-b border-surface-line py-4">
          <p className="text-body-lg font-bold text-ink">Cuándo avisar</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setCfg(c => ({ ...c, reminder_mode: 'day_before_at_hour' }))}
              className={`rounded-chip px-3 py-2 text-label font-bold ${
                cfg.reminder_mode === 'day_before_at_hour' ? 'bg-v-soft text-v-d' : 'bg-surface-bg text-ink-2'
              }`}
            >
              Día anterior
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setCfg(c => ({ ...c, reminder_mode: 'hours_before' }))}
              className={`rounded-chip px-3 py-2 text-label font-bold ${
                cfg.reminder_mode === 'hours_before' ? 'bg-v-soft text-v-d' : 'bg-surface-bg text-ink-2'
              }`}
            >
              Horas antes
            </button>
          </div>
          {cfg.reminder_mode === 'day_before_at_hour' ? (
            <label className="mt-3 block">
              <span className="mb-1.5 block text-caption font-bold text-ink-2">Hora de envío (0–23)</span>
              <input
                type="number"
                min={0}
                max={23}
                className={inputCls}
                value={cfg.reminder_send_hour}
                disabled={pending}
                onChange={e => setCfg(c => ({ ...c, reminder_send_hour: Number(e.target.value) }))}
              />
            </label>
          ) : (
            <label className="mt-3 block">
              <span className="mb-1.5 block text-caption font-bold text-ink-2">Horas antes de la cita</span>
              <input
                type="number"
                min={1}
                max={168}
                className={inputCls}
                value={cfg.reminder_hours_before}
                disabled={pending}
                onChange={e => setCfg(c => ({ ...c, reminder_hours_before: Number(e.target.value) }))}
              />
            </label>
          )}
        </div>
        <div className="py-4">
          <Button full disabled={pending} onClick={saveConfig}>
            {pending ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      </AjustesSection>

      <AjustesSection title="Plantilla">
        <p className="border-b border-surface-line py-3 text-body text-ink-2">
          Placeholders: {'{{cliente}}'}, {'{{servicio}}'}, {'{{dia}}'}, {'{{fecha}}'}, {'{{hora}}'}
        </p>
        <textarea
          className={`${inputCls} min-h-[120px] resize-none border-0 bg-transparent py-3`}
          value={cuerpo}
          disabled={pending}
          onChange={e => setCuerpo(e.target.value)}
        />
        <div className="border-t border-surface-line py-4">
          <Button full disabled={pending} onClick={saveTemplate}>
            {pending ? 'Guardando…' : 'Guardar plantilla'}
          </Button>
        </div>
      </AjustesSection>

      <AjustesSection title="Envío de prueba">
        {testAppointments.length === 0 ? (
          <p className="py-4 text-body text-ink-2">No hay citas programadas para probar.</p>
        ) : (
          <>
            <label className="block border-b border-surface-line py-4">
              <span className="mb-1.5 block text-caption font-bold text-ink-2">Cita</span>
              <select
                className={inputCls}
                value={testApptId}
                disabled={pending}
                onChange={e => setTestApptId(e.target.value)}
              >
                {testAppointments.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </label>
            <div className="py-4">
              <Button variant="secondary" full disabled={pending} onClick={sendTest}>
                {pending ? 'Enviando…' : 'Enviar prueba'}
              </Button>
            </div>
          </>
        )}
      </AjustesSection>

      <AjustesSection title="Envíos recientes">
        {logs.length === 0 ? (
          <p className="py-4 text-body text-ink-2">Sin SMS todavía.</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="border-b border-surface-line py-4 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-badge px-2.5 py-1 text-caption font-bold ${statusChip(log.status)}`}>
                  {log.status}
                </span>
                {log.simulated && (
                  <span className="rounded-badge bg-v-soft px-2.5 py-1 text-caption font-bold text-v-d">
                    Simulado
                  </span>
                )}
                {log.origin === 'prueba' && (
                  <span className="rounded-badge bg-surface-bg px-2.5 py-1 text-caption font-bold text-ink-2">
                    Prueba
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-body text-ink-2">{log.body}</p>
              <p className="mt-1 text-caption text-ink-3">
                {log.to_phone}
                {' · '}
                {when.format(new Date(log.sent_at ?? log.created_at))}
                {log.delivered_at && ` · Entregado ${when.format(new Date(log.delivered_at))}`}
                {log.error_message && ` · ${log.error_message}`}
              </p>
            </div>
          ))
        )}
      </AjustesSection>
    </AjustesHeader>
  );
}
