import React from 'react';

export const PATH = {
  back: 'M15 5l-7 7 7 7',
  next: 'M5 12h14M13 6l6 6-6 6',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 10l5-5 5 5M5 19h14',
  share: 'M12 15V4M8 8l4-4 4 4M5 13v6h14v-6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  refresh: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5',
  search: 'M11 5a6 6 0 1 0 0 12a6 6 0 1 0 0-12zM20 20l-3.5-3.5',
  plus: 'M12 5v14M5 12h14',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  noImage: 'M5 5h14v14H5zM5 19L19 5',
  safe: 'M4 4h16v16H4zM4 8h16M4 16h16',
  whatsapp: 'M4 20l1.4-4.2A8 8 0 1 1 8.4 19z',
  email: 'M3 6h18v12H3zM3 7l9 6 9-6',
  instagram: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M17 7h.01',
};

export function Icon({ d, size = 18, stroke = 1.8, color = 'currentColor', style }: { d: string; size?: number; stroke?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} style={{ strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0, ...style }} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Avatar de Marlén (degradado de marca Marlenapp) */
export function MarlenAvatar({ size = 24 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #F91F60 0%, #CF00A8 50%, #1E6BF4 100%)', color: '#fff', fontSize: Math.round(size * 0.42), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden="true">M</span>
  );
}
