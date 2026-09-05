/** Identidad visual de Marlenne. Sin DOM ni next/* — sirve si un día hay RN. */

export const BRAND_NAME = 'Marlenne';

/** Colores del logotipo oficial (degradado 135°). */
export const BRAND = {
  pink: '#FF1F5B',
  magenta: '#B621C8',
  blue: '#2D65FF',
  gradient: 'linear-gradient(135deg, #FF1F5B 0%, #B621C8 48%, #2D65FF 100%)',
} as const;

/**
 * Chrome de PWA y theme-color (paso 1: sutil).
 * El degradado completo queda para splash e icono.
 */
export const BRAND_UI = {
  theme: '#8E4DE6',
  splashBg: '#B621C8',
  background: '#F4EEFA',
} as const;

export const SPLASH_SEEN_KEY = 'marlenne-booted';
