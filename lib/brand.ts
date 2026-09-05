/** Identidad visual de Marlén. Sin DOM ni next/* — sirve si un día hay RN. */

export const BRAND_NAME = 'Marlén';

/** Colores del logotipo oficial (degradado 135°). */
export const BRAND = {
  pink: '#FF1F5B',
  magenta: '#B621C8',
  blue: '#2D65FF',
  gradient: 'linear-gradient(135deg, #FF1F5B 0%, #B621C8 48%, #2D65FF 100%)',
} as const;

/** Chrome de PWA. El degradado oficial vive en `BRAND.gradient` y `--grad`. */
export const BRAND_UI = {
  theme: '#B621C8',
  splashBg: '#FFFFFF',
  background: '#F4EEFA',
} as const;

export const SPLASH_SEEN_KEY = 'marlenne-booted';
