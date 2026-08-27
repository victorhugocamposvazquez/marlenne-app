export type CategoryId = 'corporal' | 'facial' | 'laser' | 'micro' | 'bienestar' | 'valoracion';

// bg/fg apuntan a variables CSS (claro/oscuro) definidas en app/globals.css.
// `color` es el acento saturado, legible en ambos modos.
export const CATEGORIES: Record<CategoryId, { label: string; color: string; bg: string; fg: string }> = {
  corporal:   { label: 'Corporal',           color: '#8B5CF6', bg: 'var(--cat-corporal-bg)',   fg: 'var(--cat-corporal-fg)' },
  facial:     { label: 'Facial',             color: '#EC4899', bg: 'var(--cat-facial-bg)',     fg: 'var(--cat-facial-fg)' },
  laser:      { label: 'Depilación láser',   color: '#0EA5E9', bg: 'var(--cat-laser-bg)',      fg: 'var(--cat-laser-fg)' },
  micro:      { label: 'Micropigmentación',  color: '#F59E0B', bg: 'var(--cat-micro-bg)',      fg: 'var(--cat-micro-fg)' },
  bienestar:  { label: 'Bienestar',          color: '#10B981', bg: 'var(--cat-bienestar-bg)',  fg: 'var(--cat-bienestar-fg)' },
  valoracion: { label: 'Valoraciones',       color: '#9B96B8', bg: 'var(--cat-valoracion-bg)', fg: 'var(--cat-valoracion-fg)' },
};

export type StatusId = 'prog' | 'curso' | 'done' | 'noshow';

export const STATUS: Record<StatusId, { label: string; bg: string; border: string; edge: string }> = {
  prog:   { label: 'Agendada',  bg: 'var(--st-prog-bg)',   border: 'var(--st-prog-line)',   edge: 'var(--st-prog-edge)' },
  curso:  { label: 'En cabina', bg: 'var(--st-curso-bg)',  border: 'var(--st-curso-line)',  edge: 'var(--st-curso-edge)' },
  done:   { label: 'Hecha',     bg: 'var(--st-done-bg)',   border: 'var(--st-done-line)',   edge: 'var(--st-done-edge)' },
  noshow: { label: 'No vino',   bg: 'var(--st-noshow-bg)', border: 'var(--st-noshow-line)', edge: 'var(--st-noshow-edge)' },
};

const PALETTE = ['#8B5CF6', '#6366F1', '#EC4899', '#0EA5E9', '#F59E0B', '#10B981', '#A855F7'];

export function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return PALETTE[h % PALETTE.length];
}

export const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
