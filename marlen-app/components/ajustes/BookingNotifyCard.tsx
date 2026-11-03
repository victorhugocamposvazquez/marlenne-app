'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { saveBookingNotifySettings } from '@/app/actions/booking-links';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { useToast } from '@/components/Toast';

const fieldCls =
  'mt-1.5 w-full rounded-field border border-surface-line bg-white px-3 py-2.5 text-body outline-none ring-v focus:ring-2';

export default function BookingNotifyCard({
  initialEmail,
  initialSmsReminders,
}: {
  initialEmail: string | null;
  initialSmsReminders: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [sms, setSms] = useState(initialSmsReminders);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await saveBookingNotifySettings({
        notifyEmail: email,
        smsReminders: sms,
      });
      if (!r.ok) {
        toast(r.error);
        return;
      }
      toast('Avisos de reserva guardados');
      router.refresh();
    });
  }

  return (
    <AjustesSection title="Avisos de reserva online" className="mt-0">
      <div className="space-y-3 py-4">
        <p className="text-body leading-snug text-ink-2">
          Email al centro cuando alguien reserve. La clienta recibe confirmación si deja email.
          El SMS de recordatorio usa la config general de SMS.
        </p>
        <label className="block">
          <span className="text-caption font-semibold text-ink-2">Email del centro</span>
          <input
            type="email"
            className={fieldCls}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="reservas@tusalon.com"
          />
        </label>
        <label className="flex items-center gap-2 text-caption font-semibold text-ink">
          <input
            type="checkbox"
            checked={sms}
            onChange={e => setSms(e.target.checked)}
            className="h-4 w-4 rounded border-surface-line"
          />
          Encolar recordatorio SMS también en reservas online
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-pill bg-ink px-4 py-2 text-caption font-semibold text-white disabled:opacity-45"
        >
          <Check className="h-3.5 w-3.5" />
          {pending ? 'Guardando…' : 'Guardar avisos'}
        </button>
      </div>
    </AjustesSection>
  );
}
