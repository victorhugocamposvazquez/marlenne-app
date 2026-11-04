/** Banco de copy estático (JSON). Sin red ni IA. */

import bank from '@/lib/marketing/copy-bank.json';
import {
  formatEurFromCents,
  type CreativePayload,
  type MarketingBrand,
  type MarketingKind,
} from '@/lib/marketing/types';
import type { PackTemplate, Provider, ServiceOption } from '@/lib/types';

export type CopyVars = {
  salon: string;
  name: string;
  sessions: string;
  minutes: string;
  price: string;
  job: string;
  service: string;
  service_suffix: string;
};

type KindBank = {
  kickers: string[];
  headlines: string[];
  sublines: string[];
  ctas: string[];
};

function pick<T>(arr: T[], avoid?: T): T {
  if (!arr.length) throw new Error('copy bank vacío');
  if (arr.length === 1) return arr[0]!;
  let next = arr[Math.floor(Math.random() * arr.length)]!;
  if (avoid !== undefined) {
    for (let i = 0; i < 6 && next === avoid; i++) {
      next = arr[Math.floor(Math.random() * arr.length)]!;
    }
  }
  return next;
}

export function fillCopyTemplate(template: string, vars: CopyVars): string {
  return template
    .replaceAll('{salon}', vars.salon)
    .replaceAll('{name}', vars.name)
    .replaceAll('{sessions}', vars.sessions)
    .replaceAll('{minutes}', vars.minutes)
    .replaceAll('{price}', vars.price)
    .replaceAll('{job}', vars.job)
    .replaceAll('{service}', vars.service)
    .replaceAll('{service_suffix}', vars.service_suffix)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function copyVarsFromContext(
  brand: MarketingBrand,
  ctx: {
    pack?: PackTemplate | null;
    service?: ServiceOption | null;
    staff?: Provider | null;
  } = {},
): CopyVars {
  const salon = brand.salonName || 'Tu centro';
  const pack = ctx.pack;
  const service = ctx.service;
  const staff = ctx.staff;
  const serviceName = service?.name || pack?.service_name || '';
  const priceCents = service?.price_cents ?? pack?.price_cents;
  return {
    salon,
    name:
      pack?.name ||
      service?.name ||
      staff?.full_name ||
      salon,
    sessions: pack ? String(pack.sessions_total) : '',
    minutes: service ? String(service.duration_min) : '',
    price: typeof priceCents === 'number' ? formatEurFromCents(priceCents) : '',
    job: staff?.job_title || 'Profesional',
    service: serviceName,
    service_suffix: serviceName ? ` · ${serviceName}` : '',
  };
}

function bankFor(kind: MarketingKind): KindBank {
  return bank[kind] as KindBank;
}

/** Una variante de textos del banco (cliente o servidor; 0 I/O). */
export function suggestCopy(
  kind: MarketingKind,
  brand: MarketingBrand,
  ctx: {
    pack?: PackTemplate | null;
    service?: ServiceOption | null;
    staff?: Provider | null;
  } = {},
  avoid?: Partial<Pick<CreativePayload, 'kicker' | 'headline' | 'subline' | 'ctaLabel'>>,
): Pick<CreativePayload, 'kicker' | 'headline' | 'subline' | 'ctaLabel' | 'priceLabel' | 'caption'> {
  const b = bankFor(kind);
  const vars = copyVarsFromContext(brand, ctx);
  const kicker = fillCopyTemplate(pick(b.kickers, avoid?.kicker), vars);
  const headline = fillCopyTemplate(pick(b.headlines, avoid?.headline), vars);
  const subline = fillCopyTemplate(pick(b.sublines, avoid?.subline), vars);
  const ctaLabel = fillCopyTemplate(pick(b.ctas, avoid?.ctaLabel), vars);
  const priceLabel = vars.price;
  return {
    kicker,
    headline,
    subline,
    ctaLabel,
    priceLabel,
    caption: `${headline} · ${vars.salon}`.slice(0, 160),
  };
}
