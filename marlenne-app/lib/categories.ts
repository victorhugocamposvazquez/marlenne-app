export type CategoryId = 'corporal' | 'facial' | 'laser' | 'micro' | 'bienestar' | 'valoracion';

export const CATEGORIES: Record<CategoryId, { label: string; color: string; bg: string; fg: string }> = {
  corporal:   { label: 'Corporal',           color: '#8B5CF6', bg: '#EDE9FE', fg: '#6D28D9' },
  facial:     { label: 'Facial',             color: '#EC4899', bg: '#FCE7F3', fg: '#BE185D' },
  laser:      { label: 'Depilación láser',   color: '#0EA5E9', bg: '#E0F2FE', fg: '#0369A1' },
  micro:      { label: 'Micropigmentación',  color: '#F59E0B', bg: '#FEF3C7', fg: '#B45309' },
  bienestar:  { label: 'Bienestar',          color: '#10B981', bg: '#D1FAE5', fg: '#047857' },
  valoracion: { label: 'Valoraciones',       color: '#9B96B8', bg: '#F1EFF8', fg: '#635E80' },
};

export type StatusId = 'prog' | 'curso' | 'done' | 'noshow';

export const STATUS: Record<StatusId, { label: string; bg: string; border: string; edge: string }> = {
  prog:   { label: 'Agendada',  bg: '#FFFFFF', border: '#EFEDF8', edge: '#8B5CF6' },
  curso:  { label: 'En cabina', bg: '#ECFDF5', border: '#A7F3D0', edge: '#10B981' },
  done:   { label: 'Hecha',     bg: '#F7F6FB', border: '#EFEDF8', edge: '#C9C4DE' },
  noshow: { label: 'No vino',   bg: '#FEF2F6', border: '#FBCFE8', edge: '#EC4899' },
};

const PALETTE = ['#8B5CF6', '#6366F1', '#EC4899', '#0EA5E9', '#F59E0B', '#10B981', '#A855F7'];

export function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return PALETTE[h % PALETTE.length];
}

export const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
