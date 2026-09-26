'use client';

import { useEffect, useState, useTransition } from 'react';
import { saveStaffVoicePrefs } from '@/app/actions/staff-app-prefs';
import AjustesSection from '@/components/ajustes/AjustesSection';
import {
  DEFAULT_VOICE_PREFS,
  VOICE_PREFS_EVENT,
  getVoicePrefs,
  setVoicePrefs,
  type VoicePrefs,
} from '@/hooks/voice-prefs';

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
      <span className={`h-7 w-12 shrink-0 rounded-full p-0.5 ${on ? 'bg-v-2' : 'bg-surface-line'}`}>
        <span className={`block h-6 w-6 rounded-full bg-surface-card shadow ${on ? 'ml-5' : ''}`} />
      </span>
    </button>
  );
}

function persistVoice(patch: Partial<VoicePrefs>, startTransition: (fn: () => void) => void) {
  setVoicePrefs(patch);
  startTransition(() => {
    void saveStaffVoicePrefs(patch);
  });
}

export default function VoiceSettingsCard({
  initialVoice,
}: {
  initialVoice?: VoicePrefs | null;
}) {
  const [prefs, setPrefs] = useState<VoicePrefs>(initialVoice ?? DEFAULT_VOICE_PREFS);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const sync = () => setPrefs(getVoicePrefs());
    sync();
    window.addEventListener(VOICE_PREFS_EVENT, sync);
    return () => window.removeEventListener(VOICE_PREFS_EVENT, sync);
  }, []);

  return (
    <AjustesSection title="Voz">
      <p className="pb-2 text-body text-ink-2">
        Se guarda en tu cuenta: el mismo cambio llega al móvil del centro si está con la misma usuaria.
      </p>
      {note && <p className="pb-2 text-body font-semibold text-danger-fg">{note}</p>}
      <Row
        title="Desactivar Marlén"
        hint="Oculta el micro flotante. La agenda y el resto siguen igual."
        on={prefs.off}
        disabled={pending}
        onToggle={() => persistVoice({ off: !prefs.off }, startTransition)}
      />
      <Row
        title="Solo al tocar el micro"
        hint="Nada de oído de fondo. Tú pulsas y hablas."
        on={prefs.micOnly}
        disabled={pending}
        onToggle={() => persistVoice({ micOnly: !prefs.micOnly }, startTransition)}
      />
      <Row
        title="Oír «Hola Marlén»"
        hint="Con la app abierta, la frase despierta el micro."
        on={prefs.hola && !prefs.micOnly}
        disabled={prefs.micOnly || pending}
        onToggle={() => persistVoice({ hola: !prefs.hola }, startTransition)}
      />
      <Row
        title="Responder en voz"
        hint="Lee las confirmaciones en voz alta. Si va apagado, solo se ve el texto."
        on={prefs.speak}
        disabled={pending}
        onToggle={() => persistVoice({ speak: !prefs.speak }, startTransition)}
      />
      <Row
        title="Frases nuevas en la nube"
        hint="Nombres y horas con la misma Elvira. Los clips no gastan. Se puede apagar aquí o en el servidor."
        on={prefs.cloud && prefs.speak}
        disabled={!prefs.speak || pending}
        onToggle={() => persistVoice({ cloud: !prefs.cloud }, startTransition)}
      />
    </AjustesSection>
  );
}
