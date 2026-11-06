import type { IgMedia } from '@/lib/web/instagram';
import type { PlaceSnapshot } from '@/lib/web/places';

export type HeroVariant = 'split' | 'full' | 'card' | 'stack';
export type ServiceLayout = 'menu' | 'cards' | 'grid';
export type Tone = 'cercano' | 'directo' | 'premium';
export type TabId = 'look' | 'photo' | 'text' | 'svc' | 'fx' | 'dom';
export type ServiceMedia = 'photo' | 'icon' | 'none';
export type IconStyle = 'line' | 'solid' | 'plain';
export type BookingMode = 'float' | 'embed' | 'both' | 'off';
/** Cómo se muestran las fotos de Instagram en la web. */
export type IgLayout = 'carousel' | 'spotlight' | 'grid';

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
  /** Mostrar enlace / botón al perfil de Instagram (además del feed). */
  igLink: boolean;
  /** Presentación del feed (carrusel por defecto). */
  igLayout: IgLayout;
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
  /** URL /embed/… para iframe y modal (si falta, se deriva de bookingUrl). */
  bookingEmbedUrl?: string;
  /** Datos de Visítanos (cuenta del centro). */
  phone?: string | null;
  address?: string | null;
  /** Horario (texto libre, líneas). */
  hours?: string | null;
  /** Zona SEO («en Chamberí»). */
  zone?: string | null;
  /** Muestra botones flotantes (desactivar en miniaturas del editor). */
  showFloat?: boolean;
  /** Slug público para enlaces legales /s/{slug}/… */
  siteSlug?: string | null;
  /** Media cacheada de Instagram Graph (si hay token). */
  igMedia?: IgMedia[];
  /** Snapshot Places (reseñas / rating). */
  place?: PlaceSnapshot | null;
  /** Importes tarjeta regalo (€). */
  giftAmounts?: number[];
}
