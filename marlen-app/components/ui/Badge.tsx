type Tone = 'brand' | 'ok' | 'warn' | 'danger' | 'neutral';

const TONES: Record<Tone, string> = {
  brand: 'bg-v-soft text-v-d',
  ok: 'bg-ok-bg text-ok-fg',
  warn: 'bg-warn-bg text-warn-fg',
  danger: 'bg-danger-bg text-danger-fg',
  neutral: 'bg-surface-bg text-ink-2',
};

export default function Badge({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-badge px-2 py-1 text-micro font-bold ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
