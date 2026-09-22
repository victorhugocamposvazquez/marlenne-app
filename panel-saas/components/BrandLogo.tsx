export default function BrandLogo({ size = 32, light = false }: { size?: number; light?: boolean }) {
  const fill = light ? '#ffffff' : 'url(#lgp)';
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} aria-hidden>
      {!light && (
        <defs>
          <linearGradient id="lgp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff2455" />
            <stop offset="45%" stopColor="#d000a8" />
            <stop offset="100%" stopColor="#0879ff" />
          </linearGradient>
        </defs>
      )}
      <rect x="32" y="32" width="960" height="960" rx="210" fill={fill} />
      <path d="M198 673 L198 189 L350 189 L512 445 L674 189 L826 189 L826 673 L710 673 L710 373 L566 613 L458 613 L314 373 L314 673 Z" fill="#ffffff" />
      <path d="M300 769 Q512 925 724 769" fill="none" stroke="#ffffff" strokeWidth="48" strokeLinecap="round" />
    </svg>
  );
}
