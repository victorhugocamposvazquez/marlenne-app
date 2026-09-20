'use client';

import { useEffect, useState } from 'react';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { VOICE_PREFS_EVENT, getVoicePrefs, setVoicePrefs, type VoicePrefs } from '@/hooks/voice-prefs';

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
      <span className={`h-7 w-12 shrink-0 rounded-full p-0.5 ${on ? 'bg-ink' : 'bg-surface-line'}`}>
        <span className={`block h-6 w-6 rounded-full bg-surface-card shadow ${on ? 'ml-5' : ''}`} />
      </span>
    </button>
  );
}

export default function VoiceSettingsCard() {
  const [prefs, setPrefs] = useState<VoicePrefs>({ hola: true, speak: true, micOnly: false, cloud: true });

  useEffect(() => {
    const sync = () => setPrefs(getVoicePrefs());
    sync();
    window.addEventListener(VOICE_PREFS_EVENT, sync);
    return () => window.removeEventListener(VOICE_PREFS_EVENT, sync);
  }, []);

  return (
    <AjustesSection title="Voz">
      <Row
        title="Solo al tocar el micro"
        hint="Nada de oído de fondo. Tú pulsas y hablas."
        on={prefs.micOnly}
        onToggle={() => setVoicePrefs({ micOnly: !prefs.micOnly })}
      />
      <Row
        title="Oír «Hola Marlén»"
        hint="Con la app abierta, la frase despierta el micro."
        on={prefs.hola && !prefs.micOnly}
        disabled={prefs.micOnly}
        onToggle={() => setVoicePrefs({ hola: !prefs.hola })}
      />
      <Row
        title="Responder en voz"
        hint="Lee las confirmaciones en voz alta. Si va apagado, solo se ve el texto."
        on={prefs.speak}
        onToggle={() => setVoicePrefs({ speak: !prefs.speak })}
      />
      <Row
        title="Frases nuevas en la nube"
        hint="Nombres y horas con la misma Elvira. Los clips no gastan. Se puede apagar aquí o en el servidor."
        on={prefs.cloud && prefs.speak}
        disabled={!prefs.speak}
        onToggle={() => setVoicePrefs({ cloud: !prefs.cloud })}
      />
    </AjustesSection>
  );
}
