/** Config persistida de la web del centro (JSON en salon_sites.config). */

import type { IgMedia } from '@/lib/web/instagram';
import type { PlaceSnapshot } from '@/lib/web/places';
import type {
  Extras,
  IconStyle,
  Photo,
  Sections,
  Service,
  ServiceMedia,
  SiteTexts,
  Tone,
} from '@/lib/web/types';

export type SiteFeeds = {
  ig?: IgMedia[];
  igFetchedAt?: string | null;
  place?: PlaceSnapshot | null;
  placeFetchedAt?: string | null;
};

export type SalonSiteConfig = {
  tplId: string;
  palId: string;
  tone: Tone;
  txt: SiteTexts;
  txtManual: boolean;
  sec: Sections;
  fx: Extras;
  svcs: Service[];
  svcMedia: ServiceMedia | null;
  iconStyle: IconStyle;
  svcImg: Record<string, Photo>;
  svcIcon: Record<string, string>;
  photos: { hero: Photo | null; about: Photo | null; team: (Photo | null)[] };
  zone: string;
  /** Horario libre (líneas). */
  hours: string;
  domMode: 'marlen' | 'own';
  ownDomain: string;
  /** Importes de tarjeta regalo en euros (p. ej. 30, 50, 100). */
  giftAmounts?: number[];
  /** Caché de Instagram / Places (rellenada al publicar o refrescar). */
  feeds?: SiteFeeds;
};

export type SalonSiteRow = {
  id: string;
  salonId: string;
  slug: string;
  customDomain: string | null;
  publishedAt: string | null;
  config: SalonSiteConfig;
  updatedAt: string;
};

export function emptySiteConfig(partial?: Partial<SalonSiteConfig>): SalonSiteConfig {
  return {
    tplId: 'atelier',
    palId: 'crema',
    tone: 'cercano',
    txt: {
      heroTitle: '',
      heroSub: '',
      aboutTitle: '',
      aboutText: '',
      cta: 'Reservar cita',
    },
    txtManual: false,
    sec: { servicios: true, nosotros: true, equipo: true, visitanos: true },
    fx: {
      book: 'float',
      wa: true,
      waNum: '',
      waMsg: '',
      bar: false,
      barText: '',
      reviews: false,
      gUrl: '',
      gift: false,
      insta: false,
      igUser: '',
      igLink: false,
    },
    svcs: [],
    svcMedia: null,
    iconStyle: 'line',
    svcImg: {},
    svcIcon: {},
    photos: { hero: null, about: null, team: [] },
    zone: '',
    hours: '',
    domMode: 'marlen',
    ownDomain: '',
    giftAmounts: [30, 50, 100],
    feeds: {},
    ...partial,
  };
}

export function parseSiteConfig(raw: unknown): SalonSiteConfig {
  const base = emptySiteConfig();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const giftAmounts = Array.isArray(o.giftAmounts)
    ? (o.giftAmounts as number[]).map(n => Math.round(Number(n))).filter(n => n >= 5 && n <= 500)
    : base.giftAmounts;
  return emptySiteConfig({
    ...(o as Partial<SalonSiteConfig>),
    fx: { ...base.fx, ...((o.fx as Extras) || {}) },
    sec: { ...base.sec, ...((o.sec as Sections) || {}) },
    txt: { ...base.txt, ...((o.txt as SiteTexts) || {}) },
    photos: {
      hero: (o.photos as SalonSiteConfig['photos'])?.hero ?? null,
      about: (o.photos as SalonSiteConfig['photos'])?.about ?? null,
      team: (o.photos as SalonSiteConfig['photos'])?.team ?? [],
    },
    svcImg: (o.svcImg as Record<string, Photo>) || {},
    svcIcon: (o.svcIcon as Record<string, string>) || {},
    svcs: Array.isArray(o.svcs) ? (o.svcs as Service[]) : [],
    giftAmounts: giftAmounts?.length ? giftAmounts : base.giftAmounts,
    feeds: (o.feeds as SiteFeeds) || {},
  });
}
