'use client';

import { useEffect, useState } from 'react';
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
      className="flex min-h-[44px] w-full items-center gap-3 border-b border-surface-line py-3 text-left last:border-0 disabled:opacity-45"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body font-bold text-ink">{title}</span>
        <span className="block text-caption font-medium leading-snug text-ink-2">{hint}</span>
      </span>
      <span className={`h-6 w-10 shrink-0 rounded-full p-0.5 ${on ? 'bg-grad' : 'bg-surface-line'}`}>
        <span className={`block h-5 w-5 rounded-full bg-surface-card shadow ${on ? 'ml-4' : ''}`} />
      </span>
    </button>
  );
}

export default function VoiceSettingsCard() {
  const [prefs, setPrefs] = useState<VoicePrefs>({ hola: true, speak: true, micOnly: false });

  useEffect(() => {
    const sync = () => setPrefs(getVoicePrefs());
    sync();
    window.addEventListener(VOICE_PREFS_EVENT, sync);
    return () => window.removeEventListener(VOICE_PREFS_EVENT, sync);
  }, []);

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">
        Voz
      </h2>
      <div className="rounded-row border border-surface-line bg-surface-card px-3.5 shadow-card">
        <Row
          title="Solo al tocar el micro"
          hint="Nada de oído de fondo. Tú pulsas y hablas."
          on={prefs.micOnly}
          onToggle={() => setVoicePrefs({ micOnly: !prefs.micOnly })}
        />
        <Row
          title="Oír «Hola Marlenne»"
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
      </div>
    </section>
  );
}
