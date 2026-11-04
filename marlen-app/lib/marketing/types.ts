export type StyleId = 'soft' | 'editorial' | 'promo' | 'minimal' | 'card' | 'luxe';
export type FormatId = 'story' | 'square' | 'portrait';
export type TypeId = 'bono' | 'servicio' | 'reserva' | 'ultima' | 'equipo' | 'regalo';
export type Tone = 'cercano' | 'directo' | 'premium';
export type TabId = 'imagen' | 'estilo' | 'elementos' | 'texto';
export type ElementKey = 'seal' | 'underline' | 'sparkles' | 'shape' | 'frame';

export interface Fields {
  eyebrow: string;
  title: string;
  subtitle: string;
  price: string;
  cta: string;
}

export interface Elements {
  seal: boolean;
  sealText: string;
  underline: boolean;
  sparkles: boolean;
  shape: boolean;
  frame: boolean;
}

export interface CreativeImage {
  bg: string;
  src?: string;
  label: string;
}

export interface CreativeConfig extends Fields {
  style: StyleId;
  format: FormatId;
  accent: string;
  logo?: string;
  showLogo: boolean;
  link: string;
  image: CreativeImage | null;
  elements: Elements;
}

export interface CatalogItem {
  label: string;
  meta: string;
  price: string;
  title: string;
  subtitle: string;
  cta?: string;
  eyebrow?: string;
  theme: string;
  /** Datos para rellenar los {placeholders} del banco de textos */
  vars: Record<string, string | number>;
}

export interface CreativeType {
  id: TypeId;
  /** Clave en textos-marketing.json si difiere del id */
  bank?: string;
  label: string;
  desc: string;
  note: string;
  question?: string;
  style: StyleId;
  eyebrow: string;
  cta: string;
  icon: string;
  items: CatalogItem[];
}

export interface BankImage {
  id: string;
  theme: string;
  label: string;
  bg: string;
  src?: string;
}

export interface LibraryItem {
  id: string;
  seed?: boolean;
  type: TypeId;
  catIdx: number;
  style: StyleId;
  format: FormatId;
  image: string | null;
  fields: Fields;
  els: Elements;
  showLogo: boolean;
  date: string;
}
