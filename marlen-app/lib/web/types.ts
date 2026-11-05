export type HeroVariant = 'split' | 'full' | 'card' | 'stack';
export type ServiceLayout = 'menu' | 'cards' | 'grid';
export type Tone = 'cercano' | 'directo' | 'premium';
export type TabId = 'look' | 'photo' | 'text' | 'svc' | 'fx' | 'dom';
export type ServiceMedia = 'photo' | 'icon' | 'none';
export type IconStyle = 'line' | 'solid' | 'plain';
export type BookingMode = 'float' | 'embed' | 'both' | 'off';

export interface Palette {
  id: string; label: string; sub?: string;
  bg: string; surface: string; ink: string; muted: string; accent: string; onAccent: string; line: string;
}

export interface Look { id: string; hero: HeroVariant; svc: ServiceLayout; serif: boolean; radius: number; br: string }

export interface Template extends Look { name: string; desc: string; tone: Tone; pals: Palette[] }

export interface SiteTexts { heroTitle: string; heroSub: string; aboutTitle: string; aboutText: string; cta: string }

export interface Sections { servicios: boolean; nosotros: boolean; equipo: boolean; visitanos: boolean }

export interface Extras {
  book: BookingMode;
  wa: boolean; waNum: string; waMsg: string;
  bar: boolean; barText: string;
  reviews: boolean; gUrl: string;
  gift: boolean;
  insta: boolean; igUser: string;
}

/** Valor de imagen: un `background` CSS (degradado del banco o url(...) de una foto subida) */
export interface Photo { bg: string; label: string | null; theme?: string; mine?: boolean }

export interface SitePhotos { hero: Photo | null; about: Photo | null; team: (Photo | null)[] }

export interface Service {
  id: string; name: string; meta: string; price: string;
  /** Visible en web */ pub: boolean;
  /** Novedad */ nov: boolean;
  /** Reserva online */ book: boolean;
}

export interface SiteService extends Service { img?: string; icon?: string }

export interface SiteProps {
  look: Look; pal: Palette; txt: SiteTexts; sec?: Sections; fx?: Partial<Extras>;
  svcs?: SiteService[]; photos?: { hero: Photo | null; about: Photo | null; team: (string | null)[] };
  /** Equipo real: [nombre, especialidad] */
  team?: [string, string][];
  svcMedia?: ServiceMedia; iconStyle?: IconStyle; narrow?: boolean;
  salon?: string; logo?: string;
  bookingUrl?: string;
  /** Datos de Visítanos (cuenta del centro). */
  phone?: string | null;
  address?: string | null;
}
