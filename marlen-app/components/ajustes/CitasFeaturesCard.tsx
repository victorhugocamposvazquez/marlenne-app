'use client';

import { useState, useTransition } from 'react';
import { saveSalonAgendaFeatures } from '@/app/actions/salon-features';
import AjustesSection from '@/components/ajustes/AjustesSection';
import type { SalonAgendaFeatures } from '@/lib/salon-features';

function Row({
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
      <span
        role="switch"
        aria-checked={on}
        className={`h-7 w-12 shrink-0 rounded-full p-0.5 ${on ? 'bg-v-2' : 'bg-surface-line'}`}
      >
        <span className={`block h-6 w-6 rounded-full bg-surface-card shadow ${on ? 'ml-5' : ''}`} />
      </span>
    </button>
  );
}

export default function CitasFeaturesCard({
  initial,
}: {
  initial: SalonAgendaFeatures;
}) {
  const [features, setFeatures] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (key: keyof SalonAgendaFeatures) => {
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    setError(null);
    startTransition(async () => {
      const r = await saveSalonAgendaFeatures({ [key]: next[key] });
      if (!r.ok) {
        setFeatures(features);
        setError(r.error ?? 'No se ha podido guardar');
      }
    });
  };

  return (
    <AjustesSection title="Qué mostrar">
      <Row
        title="Cobro en la cita"
        hint="En la ficha puedes apuntar cuánto se ha cobrado (efectivo, tarjeta, Bizum…) y cuánto queda a deber. En Hoy, la caja suma lo cobrado frente a lo previsto."
        on={features.apptPayment}
        disabled={pending}
        onToggle={() => toggle('apptPayment')}
      />
      <Row
        title="Citas sin llegar"
        hint="En Hoy, lista aparte las citas aún agendadas cuya hora pasó hace más de 10 minutos (retraso). Si lo apagas, salen mezcladas con las siguientes."
        on={features.overdueAppts}
        disabled={pending}
        onToggle={() => toggle('overdueAppts')}
      />
      {error && (
        <p className="border-t border-surface-line py-3 text-label font-semibold text-danger-fg">{error}</p>
      )}
    </AjustesSection>
  );
}
