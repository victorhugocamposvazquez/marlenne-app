import { suggestCopy } from '@/lib/marketing/copy';
import { bookingPageUrl } from '@/lib/booking/urls';
import { KIND_META } from '@/lib/marketing/styles';
import type {
  CreativePayload,
  MarketingBrand,
  MarketingKind,
} from '@/lib/marketing/types';
import type { PackTemplate, Provider, ServiceOption } from '@/lib/types';

export function defaultCtaUrl(
  brand: MarketingBrand,
  opts?: { serviceId?: string | null; linkKey?: string | null },
): string {
  if (!brand.bookingSlug) return brand.origin;
  return bookingPageUrl(brand.origin, brand.bookingSlug, {
    serviceId: opts?.serviceId ?? null,
    linkKey: opts?.linkKey ?? null,
  });
}

export function defaultsForKind(
  kind: MarketingKind,
  brand: MarketingBrand,
  ctx: {
    pack?: PackTemplate | null;
    service?: ServiceOption | null;
    staff?: Provider | null;
  } = {},
): CreativePayload {
  const copy = suggestCopy(kind, brand, ctx);
  const ctaUrl = defaultCtaUrl(brand, {
    serviceId: ctx.service?.id ?? ctx.pack?.service_id ?? null,
  });

  return {
    ...copy,
    ctaUrl,
    packTemplateId: ctx.pack?.id ?? null,
    serviceId: ctx.service?.id ?? ctx.pack?.service_id ?? null,
    staffId: ctx.staff?.id ?? null,
  };
}

export function kindNeedsItem(kind: MarketingKind): (typeof KIND_META)[MarketingKind]['needs'] {
  return KIND_META[kind].needs;
}
