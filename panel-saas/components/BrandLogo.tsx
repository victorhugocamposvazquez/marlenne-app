function MarkLetter({ color = 'currentColor' }: { color?: string }) {
  return (
    <path
      d="M198 673 L198 189 L350 189 L512 445 L674 189 L826 189 L826 673 L710 673 L710 373 L566 613 L458 613 L314 373 L314 673 Z"
      fill={color}
    />
  );
}

function MarkArc({ color = 'currentColor' }: { color?: string }) {
  return (
    <path
      d="M300 769 Q512 925 724 769"
      fill="none"
      stroke={color}
      strokeWidth="48"
      strokeLinecap="round"
    />
  );
}

type BrandLogoProps = {
  size?: number;
  /** Solo la M blanca, sin caja · sobre degradado */
  light?: boolean;
  /** Fondo negro · mismo radius que degradado · icono PWA */
  variant?: 'gradient' | 'black';
  className?: string;
};

export default function BrandLogo({
  size = 32,
  light = false,
  variant = 'gradient',
  className,
}: BrandLogoProps) {
  if (light) {
    return (
      <svg viewBox="0 0 1024 1024" width={size} height={size} aria-hidden className={`text-white ${className ?? ''}`}>
        <MarkLetter color="currentColor" />
        <MarkArc color="currentColor" />
      </svg>
    );
  }

  const fill = variant === 'black' ? '#0F0E1A' : 'url(#lgp-brand)';
  // Recorte al borde del squircle · sin padding transparente que separe del texto
  const viewBox = variant === 'black' ? '32 32 960 960' : '0 0 1024 1024';

  return (
    <svg viewBox={viewBox} width={size} height={size} aria-hidden className={className}>
      {variant === 'gradient' && (
        <defs>
          <linearGradient id="lgp-brand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff2455" />
            <stop offset="45%" stopColor="#d000a8" />
            <stop offset="100%" stopColor="#0879ff" />
          </linearGradient>
        </defs>
      )}
      <rect x="32" y="32" width="960" height="960" rx="210" fill={fill} />
      <MarkLetter color="#ffffff" />
      <MarkArc color="#ffffff" />
    </svg>
  );
}

/** M grande de fondo · panel degradado del login */
export function BrandWatermark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      aria-hidden
      className={`pointer-events-none select-none ${className ?? ''}`}
    >
      <g opacity="0.13">
        <MarkLetter color="#ffffff" />
        <MarkArc color="#ffffff" />
      </g>
    </svg>
  );
}
