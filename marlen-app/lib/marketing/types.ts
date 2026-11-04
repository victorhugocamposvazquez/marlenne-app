/** Tipos de creatividades de marketing. Sin DOM ni next/*. */

export const MARKETING_KINDS = [
  'bono',
  'servicio',
  'reserva',
  'hueco',
  'equipo',
  'regalo',
] as const;

export type MarketingKind = (typeof MARKETING_KINDS)[number];

export const MARKETING_FORMATS = [
  'story_9_16',
  'post_1_1',
  'post_4_5',
] as const;

export type MarketingFormat = (typeof MARKETING_FORMATS)[number];

export const MARKETING_STYLE_IDS = [
  'soft_gradient',
  'editorial',
  'bold_promo',
  'minimal_ink',
  'story_card',
  'luxe_dark',
] as const;

export type MarketingStyleId = (typeof MARKETING_STYLE_IDS)[number];

export type CreativePayload = {
  headline: string;
  subline: string;
  priceLabel: string;
  ctaLabel: string;
  ctaUrl: string;
  kicker?: string;
  serviceId?: string | null;
  packTemplateId?: string | null;
  staffId?: string | null;
  caption?: string;
};

export type MarketingCreativeRow = {
  id: string;
  kind: MarketingKind;
  style_id: MarketingStyleId;
  format: MarketingFormat;
  payload: CreativePayload;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
};

export type MarketingBrand = {
  salonId: string;
  salonName: string;
  logoUrl: string | null;
  accent: string;
  bookingSlug: string | null;
  origin: string;
};

export function formatEurFromCents(cents: number): string {
  const n = cents / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function publicCreativeUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/marketing-creatives/${imagePath}`;
}
