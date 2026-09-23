'use client';

import { useEffect, useState } from 'react';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { useToast } from '@/components/Toast';
import { disableStaffPush, enableStaffPush, readStaffPushEnabled, staffPushSupported, thisDevicePushOn } from '@/hooks/staff-push';

export default function StaffReminderSettings() {
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([readStaffPushEnabled(), thisDevicePushOn()]).then(([server, here]) => {
      if (!alive) return;
      setEnabled(server && here);
      setReady(true);
      if (staffPushSupported()) setBlocked(Notification.permission === 'denied');
    });
    return () => { alive = false; };
  }, []);

  const toggle = async () => {
    if (pending) return;
    if (!staffPushSupported()) {
      toast('Este navegador no admite avisos.');
      return;
    }
    setPending(true);
    if (enabled) {
      const result = await disableStaffPush();
      setPending(false);
      if (!result.ok) {
        toast(result.error);
        return;
      }
      setEnabled(false);
      toast('Avisos desactivados');
      return;
    }
    const result = await enableStaffPush();
    setPending(false);
    if (!result.ok) {
      toast(result.error);
      setBlocked(Notification.permission === 'denied');
      return;
    }
    setEnabled(true);
    setBlocked(false);
    toast('Avisos activos');
  };

  return (
    <AjustesSection title="Avisos de citas">
      <button
        type="button"
        disabled={!ready || pending}
        aria-pressed={enabled}
        onClick={() => { void toggle(); }}
        className="flex min-h-[52px] w-full items-center gap-3 py-4 text-left disabled:opacity-45"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-body-lg font-bold text-ink">Citas próximas</span>
          <span className="mt-0.5 block text-body leading-snug text-ink-2">
            Media hora antes te llega la cita de todo el equipo, y quién atiende. Por ejemplo: Cita con Manuela Lopez en 30 minutos - con Iria.
          </span>
        </span>
        <span className={`h-7 w-12 shrink-0 rounded-full p-0.5 ${enabled ? 'bg-v-2' : 'bg-surface-line'}`}>
          <span className={`block h-6 w-6 rounded-full bg-surface-card shadow ${enabled ? 'ml-5' : ''}`} />
        </span>
      </button>
      {blocked && (
        <p className="pb-4 text-body font-semibold text-ink">
          Están bloqueados en el sistema. Actívalos en los ajustes del teléfono para Marlén.
        </p>
      )}
      <button
        type="button"
        disabled={!ready || testing}
        onClick={async () => {
          if (testing) return;
          setTesting(true);
          const res = await fetch('/api/staff-reminders/test', { method: 'POST' });
          const body = await res.json().catch(() => ({})) as { sent?: number; error?: string };
          setTesting(false);
          if (!res.ok || !body.sent) {
            toast(body.error || 'El aviso no ha salido.');
            return;
          }
          toast('Aviso enviado. Mira el teléfono.');
        }}
        className="flex min-h-[48px] w-full items-center border-t border-surface-line py-3 text-left text-body font-semibold text-ink-2 disabled:opacity-45"
      >
        {testing ? 'Enviando…' : 'Probar aviso ahora'}
      </button>
    </AjustesSection>
  );
}
