/** Config persistida de la web del centro (JSON en salon_sites.config). */

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
    ...partial,
  };
}

export function parseSiteConfig(raw: unknown): SalonSiteConfig {
  const base = emptySiteConfig();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
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
  });
}
