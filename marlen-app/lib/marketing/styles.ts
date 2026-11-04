import type { MarketingFormat, MarketingKind, MarketingStyleId } from '@/lib/marketing/types';

export type FormatSize = { w: number; h: number; label: string; short: string };

export const FORMAT_SIZES: Record<MarketingFormat, FormatSize> = {
  story_9_16: { w: 1080, h: 1920, label: 'Story 9:16', short: '9:16' },
  post_1_1: { w: 1080, h: 1080, label: 'Post 1:1', short: '1:1' },
  post_4_5: { w: 1080, h: 1350, label: 'Post 4:5', short: '4:5' },
};

export type MarketingStyle = {
  id: MarketingStyleId;
  name: string;
  hint: string;
  swatch: string;
  dark: boolean;
};

export const MARKETING_STYLES: MarketingStyle[] = [
  {
    id: 'soft_gradient',
    name: 'Degradado suave',
    hint: 'Gradiente de marca, limpio y actual',
    swatch: 'linear-gradient(135deg, #ff2455, #d000a8, #0879ff)',
    dark: false,
  },
  {
    id: 'editorial',
    name: 'Editorial',
    hint: 'Mucho aire, tipografía grande',
    swatch: 'linear-gradient(180deg, #F7F7FA 0%, #FFFFFF 100%)',
    dark: false,
  },
  {
    id: 'bold_promo',
    name: 'Promo fuerte',
    hint: 'Precio enorme, ideal última hora',
    swatch: 'linear-gradient(135deg, #ff2455 0%, #ff2455 45%, #0F0E1A 45%)',
    dark: false,
  },
  {
    id: 'minimal_ink',
    name: 'Minimal tinta',
    hint: 'Fondo claro, una sola idea',
    swatch: 'linear-gradient(180deg, #FFFFFF, #F3F3F8)',
    dark: false,
  },
  {
    id: 'story_card',
    name: 'Story card',
    hint: 'Tarjeta con marco, perfecta en vertical',
    swatch: 'linear-gradient(160deg, #FFF0F8, #E8F2FF)',
    dark: false,
  },
  {
    id: 'luxe_dark',
    name: 'Luxe oscuro',
    hint: 'Premium sobre fondo oscuro',
    swatch: 'linear-gradient(145deg, #1a1824, #0F0E1A)',
    dark: true,
  },
];

export function styleById(id: MarketingStyleId): MarketingStyle {
  return MARKETING_STYLES.find(s => s.id === id) ?? MARKETING_STYLES[0]!;
}

export const KIND_META: Record<
  MarketingKind,
  { label: string; hint: string; needs: 'pack' | 'service' | 'staff' | 'none' }
> = {
  bono: { label: 'Bono', hint: 'Plantilla de sesiones con precio', needs: 'pack' },
  servicio: { label: 'Servicio', hint: 'Un tratamiento del catálogo', needs: 'service' },
  reserva: { label: 'Reserva', hint: 'Invita a pedir cita online', needs: 'none' },
  hueco: { label: 'Última hora', hint: 'Hueco o promo rápida', needs: 'service' },
  equipo: { label: 'Equipo', hint: 'Presenta a una profesional', needs: 'staff' },
  regalo: { label: 'Regalo', hint: 'Bono o tratamiento para regalar', needs: 'pack' },
};
