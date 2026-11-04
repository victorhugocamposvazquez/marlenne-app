import { bookingPageUrl } from '@/lib/booking/urls';
import { KIND_META } from '@/lib/marketing/styles';
import {
  formatEurFromCents,
  type CreativePayload,
  type MarketingBrand,
  type MarketingKind,
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
  const salon = brand.salonName || 'Tu centro';
  const baseUrl = defaultCtaUrl(brand, {
    serviceId: ctx.service?.id ?? ctx.pack?.service_id ?? null,
  });

  switch (kind) {
    case 'bono': {
      const pack = ctx.pack;
      return {
        kicker: salon,
        headline: pack?.name ?? 'Bono de sesiones',
        subline: pack
          ? `${pack.sessions_total} sesiones${pack.service_name ? ` · ${pack.service_name}` : ''}`
          : 'Elige un bono del catálogo',
        priceLabel: pack ? formatEurFromCents(pack.price_cents) : '',
        ctaLabel: 'Reservar',
        ctaUrl: baseUrl,
        packTemplateId: pack?.id ?? null,
        serviceId: pack?.service_id ?? null,
        caption: `Bono · ${salon}`,
      };
    }
    case 'servicio': {
      const s = ctx.service;
      return {
        kicker: salon,
        headline: s?.name ?? 'Tratamiento',
        subline: s ? `${s.duration_min} min` : 'Duración a medida',
        priceLabel: s ? formatEurFromCents(s.price_cents) : '',
        ctaLabel: 'Pedir cita',
        ctaUrl: defaultCtaUrl(brand, { serviceId: s?.id }),
        serviceId: s?.id ?? null,
        caption: `${s?.name ?? 'Servicio'} · ${salon}`,
      };
    }
    case 'reserva':
      return {
        kicker: salon,
        headline: 'Reserva online',
        subline: 'Elige día, hora y profesional',
        priceLabel: '',
        ctaLabel: 'Reservar ahora',
        ctaUrl: baseUrl,
        caption: `Reserva · ${salon}`,
      };
    case 'hueco': {
      const s = ctx.service;
      return {
        kicker: 'Última hora',
        headline: s?.name ?? 'Hueco disponible',
        subline: 'Hoy o mañana · reserva ya',
        priceLabel: s ? formatEurFromCents(s.price_cents) : '',
        ctaLabel: 'Quiero el hueco',
        ctaUrl: defaultCtaUrl(brand, { serviceId: s?.id }),
        serviceId: s?.id ?? null,
        caption: `Última hora · ${salon}`,
      };
    }
    case 'equipo': {
      const st = ctx.staff;
      return {
        kicker: salon,
        headline: st?.full_name ?? 'Nuestro equipo',
        subline: st?.job_title ?? 'Profesional',
        priceLabel: '',
        ctaLabel: 'Reservar conmigo',
        ctaUrl: baseUrl,
        staffId: st?.id ?? null,
        caption: `${st?.full_name ?? 'Equipo'} · ${salon}`,
      };
    }
    case 'regalo': {
      const pack = ctx.pack;
      return {
        kicker: 'Para regalar',
        headline: pack?.name ?? 'El detalle perfecto',
        subline: pack
          ? `${pack.sessions_total} sesiones`
          : 'Bono o tratamiento a elegir',
        priceLabel: pack ? formatEurFromCents(pack.price_cents) : '',
        ctaLabel: 'Regalar',
        ctaUrl: baseUrl,
        packTemplateId: pack?.id ?? null,
        serviceId: pack?.service_id ?? null,
        caption: `Regalo · ${salon}`,
      };
    }
  }
}

export function kindNeedsItem(kind: MarketingKind): (typeof KIND_META)[MarketingKind]['needs'] {
  return KIND_META[kind].needs;
}
