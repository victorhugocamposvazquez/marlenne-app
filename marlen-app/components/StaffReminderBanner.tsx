'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  enableStaffPush,
  postponeStaffReminder,
  staffPushSupported,
  staffReminderPostponed,
} from '@/hooks/staff-push';

function iosNeedsInstall(): boolean {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  return ios && !standalone;
}

export default function StaffReminderBanner() {
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (!staffPushSupported() || staffReminderPostponed()) return;
    if (Notification.permission !== 'default') return;
    setShow(true);
    setIosHint(iosNeedsInstall());
  }, []);

  if (!show) return null;

  const hide = () => {
    postponeStaffReminder();
    setShow(false);
  };

  const enable = async () => {
    setError(null);
    setPending(true);
    const result = await enableStaffPush();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShow(false);
  };

  return (
    <div className="mb-5 rounded-row bg-surface-soft p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-body font-extrabold tracking-[-.01em]">Aviso 30 minutos antes</div>
          <p className="mt-1 text-label font-medium leading-snug text-ink-2">
            Sale la cita de todo el equipo, y dice quién atiende. Por ejemplo: Cita con Manuela Lopez en 30 minutos - con Iria.
          </p>
          {iosHint && (
            <p className="mt-1 text-label font-medium leading-snug text-ink-2">
              En el iPhone, añade Marlén a inicio para que llegue con la app cerrada.
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Ahora no"
          onClick={hide}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-icon text-ink-3 motion-safe:active:scale-[.96]"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>
      {error && <p className="mt-2 text-label font-semibold text-danger-fg">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => { void enable(); }}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-field bg-grad px-4 text-body font-extrabold text-white motion-safe:active:scale-[.98] disabled:opacity-40"
      >
        <Bell size={18} strokeWidth={2.2} />
        {pending ? 'Activando…' : 'Activar avisos'}
      </button>
    </div>
  );
}
