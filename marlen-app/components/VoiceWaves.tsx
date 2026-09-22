/** Barras de oído: se ve que escucha, sin pintar el dictado (Safari lo transcribe mal). */
export default function VoiceWaves({ label = 'Escuchando' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-1" role="status" aria-live="polite" aria-label={label}>
      <div className="flex h-8 items-center justify-center gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <span
            key={i}
            className="h-7 w-1 origin-center rounded-full bg-v motion-safe:animate-voiceBar"
            style={{ animationDelay: `${i * 0.11}s` }}
          />
        ))}
      </div>
      <p className="text-caption font-semibold text-ink-2">{label}</p>
    </div>
  );
}
