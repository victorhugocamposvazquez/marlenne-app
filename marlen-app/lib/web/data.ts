import { luminance } from '@/lib/marketing/color';
import type { Extras, Palette, Photo, Sections, Service, SiteTexts, TabId, Template, Tone } from './types';

// TODO(backend): plantillas y gamas pueden vivir en código; textos, catálogo y fotos vienen de la cuenta del centro.
export const TEMPLATES: Template[] = [
  { id: 'atelier', name: 'Atelier', desc: 'Editorial y cálido', hero: 'split', svc: 'menu', serif: true, radius: 0, br: '0px', tone: 'cercano', pals: [
    { id: 'crema', label: 'Crema', bg: '#F5EFE6', surface: '#EBE2D5', ink: '#2A211B', muted: '#6B5E53', accent: '#9C6B4E', onAccent: '#FFFFFF', line: '#D9CCBB' },
    { id: 'rosa', label: 'Rosa empolvado', bg: '#F7EDEB', surface: '#EED9D5', ink: '#3A2326', muted: '#7A5E61', accent: '#A85F6A', onAccent: '#FFFFFF', line: '#E3C9C5' },
    { id: 'salvia', label: 'Salvia', bg: '#EEF0EA', surface: '#DDE3D6', ink: '#1F2A22', muted: '#5B6A5E', accent: '#56715B', onAccent: '#FFFFFF', line: '#CBD3C4' }] },
  { id: 'noir', name: 'Noir', desc: 'Oscuro, con detalles dorados', hero: 'full', svc: 'menu', serif: true, radius: 0, br: '999px', tone: 'premium', pals: [
    { id: 'noche', label: 'Noche dorada', bg: '#121018', surface: '#1C1922', ink: '#F4EFE6', muted: '#A9A3B0', accent: '#C9AE6E', onAccent: '#121018', line: '#2E2A35' },
    { id: 'burdeos', label: 'Burdeos', bg: '#170E10', surface: '#24161A', ink: '#F6ECEC', muted: '#B9A3A6', accent: '#D49AA0', onAccent: '#170E10', line: '#3A2529' },
    { id: 'azul', label: 'Azul noche', bg: '#0D1220', surface: '#161D2E', ink: '#EEF1F6', muted: '#9AA3B5', accent: '#BBC6DC', onAccent: '#0D1220', line: '#273047' }] },
  { id: 'sereno', name: 'Sereno', desc: 'Suave y luminoso, tipo spa', hero: 'card', svc: 'cards', serif: false, radius: 24, br: '999px', tone: 'cercano', pals: [
    { id: 'salvia', label: 'Salvia', bg: '#F3F5F0', surface: '#E4EAE0', ink: '#1E2B23', muted: '#55665A', accent: '#5F7D65', onAccent: '#FFFFFF', line: '#D3DDD0' },
    { id: 'arena', label: 'Arena', bg: '#F7F2EC', surface: '#EDE3D7', ink: '#2B231C', muted: '#6E6255', accent: '#9A7550', onAccent: '#FFFFFF', line: '#E0D3C3' },
    { id: 'lavanda', label: 'Lavanda', bg: '#F5F3F9', surface: '#E7E2F1', ink: '#231F33', muted: '#5F5974', accent: '#7468A8', onAccent: '#FFFFFF', line: '#D9D2E8' }] },
  { id: 'estudio', name: 'Estudio', desc: 'Minimal y moderno', hero: 'stack', svc: 'grid', serif: false, radius: 4, br: '4px', tone: 'directo', pals: [
    { id: 'porcelana', label: 'Porcelana', bg: '#FFFFFF', surface: '#F3F3F5', ink: '#0F0E1A', muted: '#5E5D6B', accent: '#0F0E1A', onAccent: '#FFFFFF', line: '#E4E3EA' },
    { id: 'coral', label: 'Coral', bg: '#FFFFFF', surface: '#FBF0EC', ink: '#1A1210', muted: '#6B5C57', accent: '#C4553C', onAccent: '#FFFFFF', line: '#EEDFD9' },
    { id: 'tintarosa', label: 'Tinta y rosa', bg: '#FBF7F8', surface: '#F3E8EB', ink: '#0F0E1A', muted: '#5E5D6B', accent: '#B23E70', onAccent: '#FFFFFF', line: '#EAD9DF' }] },
];
export const tplOf = (id: string) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
export const lookOf = (t: Template) => ({ id: t.id, hero: t.hero, svc: t.svc, serif: t.serif, radius: t.radius, br: t.br });

/** «Tu marca» (color del logo) + 3 gamas del look */
export function palettesFor(t: Template, brandColor: string): Palette[] {
  const base = t.pals[0];
  const onAccent = luminance(brandColor) > 0.35 ? (luminance(base.bg) < 0.2 ? base.bg : '#0F0E1A') : '#FFFFFF';
  return [{ ...base, id: 'brand', label: 'Tu marca', accent: brandColor, onAccent, sub: 'Con el color de tu logo' }, ...t.pals.map((p) => ({ ...p, sub: 'Pensada para ' + t.name }))];
}

// TODO(backend): sustituir por el generador de textos (mismo enfoque que textos-marketing.json).
export const TEXTS: Record<Tone, SiteTexts[]> = {
  cercano: [
    { heroTitle: 'Tu rato de calma, cerca de casa', heroSub: 'Tratamientos faciales, corporales y de manos en Madrid. Reserva en dos minutos.', aboutTitle: 'Un centro hecho con mimo', aboutText: 'En Arlett Beauty cuidamos cada detalle para que salgas sintiéndote tú. Te escuchamos, te aconsejamos y te tratamos como en casa.', cta: 'Reserva tu cita' },
    { heroTitle: 'Te cuidamos como te mereces', heroSub: 'Facial, pestañas, manicura y masajes con un equipo que te conoce por tu nombre.', aboutTitle: 'Somos Arlett Beauty', aboutText: 'Un equipo pequeño, cercano y muy formado. Nos encanta lo que hacemos y se nota en cada cita.', cta: 'Pide tu cita' }],
  directo: [
    { heroTitle: 'Belleza profesional en Madrid', heroSub: 'Facial, láser, pestañas y manicura. Reserva online las 24 horas.', aboutTitle: 'Por qué Arlett Beauty', aboutText: 'Profesionales certificadas, aparatología de última generación y precios claros. Sin esperas.', cta: 'Reservar ahora' },
    { heroTitle: 'Reserva tu tratamiento hoy', heroSub: 'Elige servicio, día y profesional. Confirmación al momento.', aboutTitle: 'Resultados que se notan', aboutText: 'Diagnóstico personalizado en cada visita y seguimiento de tu tratamiento, paso a paso.', cta: 'Ver horarios' }],
  premium: [
    { heroTitle: 'El arte de cuidarte', heroSub: 'Tratamientos de autor en el corazón de Madrid.', aboutTitle: 'La casa', aboutText: 'Técnica precisa, productos seleccionados y un espacio pensado para el silencio.', cta: 'Reservar' },
    { heroTitle: 'Belleza, sin prisa', heroSub: 'Rituales faciales y corporales a medida.', aboutTitle: 'Nuestra filosofía', aboutText: 'Menos, pero mejor. Cada tratamiento empieza por escucharte.', cta: 'Solicitar cita' }],
};
export const TEXT_LIMITS: Record<keyof SiteTexts, number> = { heroTitle: 40, heroSub: 90, aboutTitle: 30, aboutText: 220, cta: 20 };

export const TABS: [TabId, string, string][] = [
  ['look', 'Look', 'M4 4h16v16H4zM4 10h16M10 10v10'],
  ['photo', 'Imágenes', 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 1 0 0-.01'],
  ['text', 'Textos', 'M5 7V5h14v2M12 5v14M9 19h6'],
  ['svc', 'Servicios', 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01'],
  ['fx', 'Extras', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7'],
  ['dom', 'Dominio', 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z'],
];

export const TIPS: Record<TabId, string> = {
  look: 'Te recomiendo Atelier: cálido y elegante, ideal para un centro de estética. Debajo eliges los colores: «Tu marca» usa el color de tu logo.',
  photo: 'Primero decide si tus servicios llevan fotos o iconos. Después ajusta cada uno y sube las fotos de tu centro: es lo que más confianza da.',
  text: 'He escrito los textos con tu catálogo. Cambia el tono y te propongo otra versión.',
  svc: 'Los ocultos no salen en la web, pero siguen en tu agenda. Las novedades se destacan arriba con la etiqueta «Nuevo». Los que no tienen reserva online muestran «Reserva por teléfono».',
  fx: 'Te recomiendo reserva flotante y WhatsApp: son los dos botones que más citas consiguen. Las reseñas dan mucha confianza.',
  dom: 'Puedes publicar ya con tu dominio gratis y conectar el tuyo cuando quieras. De Google me encargo yo: no tienes que tocar nada.',
};

export const SECTIONS: [keyof Sections, string, string][] = [
  ['servicios', 'Servicios y precios', 'Desde tu catálogo'], ['nosotros', 'Sobre nosotros', 'Foto y texto del centro'],
  ['equipo', 'Equipo', 'Tus profesionales'], ['visitanos', 'Visítanos', 'Dirección, horario y mapa'],
];

// TODO(backend): catálogo real del centro.
export const SERVICES: Service[] = [
  { id: 'limp', name: 'Limpieza facial profunda', meta: '60 min · Extracción, peeling y mascarilla', price: '55 €', pub: true, nov: false, book: true },
  { id: 'radio', name: 'Radiofrecuencia facial', meta: '50 min · Efecto tensor', price: '70 €', pub: true, nov: true, book: true },
  { id: 'lift', name: 'Lifting de pestañas', meta: '45 min · Tinte incluido', price: '45 €', pub: true, nov: true, book: true },
  { id: 'mani', name: 'Manicura semipermanente', meta: '40 min · Más de 80 colores', price: '25 €', pub: true, nov: false, book: true },
  { id: 'masa', name: 'Masaje relajante', meta: '50 min · Aceites templados', price: '48 €', pub: true, nov: false, book: true },
  { id: 'laser', name: 'Láser diodo', meta: 'Piernas completas · Por sesión', price: '59 €', pub: true, nov: false, book: false },
  { id: 'pres', name: 'Presoterapia', meta: '45 min · Piernas ligeras', price: '40 €', pub: true, nov: false, book: true },
  { id: 'micro', name: 'Microblading', meta: 'Valoración previa en el centro', price: 'Desde 180 €', pub: false, nov: false, book: false },
];
export const TEAM: [string, string][] = [['Lucía Martín', 'Cejas y pestañas'], ['Carmen Ruiz', 'Facial y corporal'], ['Ana Gil', 'Manicura y pedicura']];

export const DEFAULT_EXTRAS: Extras = {
  book: 'float', wa: true, waNum: '', waMsg: 'Hola, quiero pedir cita',
  bar: false, barText: '−15 % en tu primera visita', reviews: false, gUrl: '',
  gift: false, insta: false, igUser: '', igLink: false, igLayout: 'carousel',
};

// TODO(backend): banco de imágenes real por temáticas (hoy, degradados con el nombre de la foto que iría).
export const BANK: [string, string, [string, string], string[]][] = [
  ['facial', 'Facial', ['#EED8CB', '#C08C76'], ['Mascarilla facial', 'Limpieza con vapor', 'Sérum sobre la piel', 'Masaje facial', 'Rodillo de jade', 'Cabina facial']],
  ['unas', 'Uñas', ['#F0D2D6', '#B57C86'], ['Manicura en curso', 'Esmaltes de color', 'Manos con anillos', 'Nail art', 'Pedicura', 'Lima y cutícula']],
  ['pestanas', 'Cejas y pestañas', ['#E3D6CC', '#8C7464'], ['Lifting de pestañas', 'Diseño de cejas', 'Mirada de cerca', 'Laminado de cejas', 'Tinte de pestañas', 'Herramientas']],
  ['corporal', 'Corporal', ['#EADBC8', '#B0916F'], ['Presoterapia', 'Tratamiento reductor', 'Exfoliación', 'Láser diodo', 'Piernas', 'Cabina corporal']],
  ['spa', 'Spa y masajes', ['#D6DFD3', '#879C89'], ['Masaje de espalda', 'Piedras calientes', 'Aceites', 'Toallas y velas', 'Masaje de pies', 'Sala de relax']],
  ['centro', 'El centro', ['#E2DCD4', '#958A80'], ['Recepción', 'Cabina', 'Escaparate', 'Productos', 'Decoración', 'Fachada']],
];
export function bankImg(theme: string, i: number): Photo {
  const b = BANK.find((x) => x[0] === theme) || BANK[0];
  const ang = [150, 205, 120, 175, 235, 95], pos = ['28% 30%', '72% 24%', '34% 72%', '76% 66%', '50% 42%', '22% 78%'];
  const [c1, c2] = i % 2 ? [b[2][1], b[2][0]] : b[2];
  return { bg: `radial-gradient(60% 55% at ${pos[i]}, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%), linear-gradient(${ang[i]}deg, ${c1} 0%, ${c2} 100%)`, label: b[3][i], theme: b[1] };
}

export const ICONS: [string, string][] = [
  ['Facial', 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z'],
  ['Mirada', 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0'],
  ['Uñas', 'M10 3h4v5h-4zM8.5 8h7l1 13h-9z'],
  ['Aceites', 'M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z'],
  ['Spa', 'M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7'],
  ['Láser', 'M13 3L5 13h6l-1 8 8-10h-6z'],
  ['Ondas', 'M3 9c3-2 6 2 9 0s6 2 9 0M3 15c3-2 6 2 9 0s6 2 9 0'],
  ['Cuidado', 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'],
  ['Cejas', 'M3 11c3-3 7-4 11-3M10 15c3-2 7-2.5 11-1'],
  ['Estrella', 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z'],
];
/** servicio → [temática del banco, foto por defecto, icono por defecto] */
export const SERVICE_MEDIA: Record<string, [string, number, number]> = {
  limp: ['facial', 0, 0], radio: ['facial', 3, 6], lift: ['pestanas', 0, 1], mani: ['unas', 0, 2],
  masa: ['spa', 0, 3], laser: ['corporal', 3, 5], pres: ['corporal', 0, 6], micro: ['pestanas', 1, 8],
};

/** Subdominios que ningún centro puede usar en nombre.marlenapp.com */
export const RESERVED = ['app', 'www', 'api', 'admin', 'mail', 'blog', 'help', 'ayuda', 'status', 'r', 'cdn', 'static', 'sites', 'marlen', 'marlenapp', 'soporte', 'login', 'pago', 'pagos', 's', 'panel'];
export const DNS_RECORDS: [string, string, string][] = [['A', '@', '76.76.21.21'], ['CNAME', 'www', 'sites.marlenapp.com']];

export const slugify = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
