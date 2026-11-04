import type { BankImage, CreativeType, Elements, ElementKey, Fields, FormatId, StyleId, Tone, TypeId } from './types';

// TODO(backend): sustituir por el catálogo real del centro (bonos, servicios, huecos libres, profesionales, tarjetas regalo).
export const TYPES: CreativeType[] = [
  {
    id: 'bono', label: 'Bono', desc: 'Pack de sesiones con precio', note: '3 bonos en tu catálogo', question: '¿Qué bono quieres anunciar?', style: 'luxe', eyebrow: 'Arlett Beauty', cta: 'Comprar bono',
    icon: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14.5 7v10',
    items: [
      { label: 'Bono 5 sesiones · Presoterapia', meta: '45 min por sesión · Válido 6 meses', price: '180 €', title: '5 sesiones de presoterapia', subtitle: '45 min por sesión · Válido 6 meses', theme: 'corporal', vars: { name: 'presoterapia', sessions: 5 } },
      { label: 'Bono 10 sesiones · Láser diodo', meta: 'Piernas completas · Válido 12 meses', price: '390 €', title: '10 sesiones de láser', subtitle: 'Piernas completas · Válido 12 meses', theme: 'depilacion', vars: { name: 'láser diodo', sessions: 10 } },
      { label: 'Bono 4 sesiones · Limpieza facial', meta: '60 min · Extracción y mascarilla', price: '160 €', title: '4 limpiezas faciales', subtitle: '60 min · Extracción y mascarilla', theme: 'facial', vars: { name: 'limpieza facial', sessions: 4 } },
    ],
  },
  {
    id: 'servicio', label: 'Servicio', desc: 'Un tratamiento del catálogo', note: '4 servicios destacados', question: '¿Qué servicio quieres anunciar?', style: 'soft', eyebrow: 'Arlett Beauty', cta: 'Reservar cita',
    icon: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
    items: [
      { label: 'Limpieza facial profunda', meta: '60 min · Extracción, peeling y mascarilla', price: '55 €', title: 'Limpieza facial profunda', subtitle: '60 min · Extracción, peeling y mascarilla', theme: 'facial', vars: { name: 'limpieza facial profunda', minutes: 60 } },
      { label: 'Lifting de pestañas', meta: '45 min · Tinte incluido', price: '45 €', title: 'Lifting de pestañas', subtitle: '45 min · Tinte incluido', theme: 'pestanas', vars: { name: 'lifting de pestañas', minutes: 45 } },
      { label: 'Manicura semipermanente', meta: '40 min · Más de 80 colores', price: '25 €', title: 'Manicura semipermanente', subtitle: '40 min · Más de 80 colores', theme: 'unas', vars: { name: 'manicura semipermanente', minutes: 40 } },
      { label: 'Masaje relajante', meta: '50 min · Aceites templados', price: '48 €', title: 'Masaje relajante', subtitle: '50 min · Aceites templados', theme: 'spa', vars: { name: 'masaje relajante', minutes: 50 } },
    ],
  },
  {
    id: 'reserva', label: 'Reserva', desc: 'Invita a pedir cita online', note: 'Con tu enlace de reserva', style: 'card', eyebrow: 'Arlett Beauty', cta: 'Reservar ahora',
    icon: 'M6 5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM3 10h18M8 3v4M16 3v4',
    items: [{ label: 'Enlace de reserva online', meta: 'app.marlenapp.com/r/arlett', price: '', title: 'Reserva online', subtitle: 'Elige día, hora y profesional', theme: 'centro', vars: {} }],
  },
  {
    id: 'ultima', bank: 'hueco', label: 'Última hora', desc: 'Llena un hueco libre de la agenda', note: '3 huecos libres esta semana', question: '¿Qué hueco quieres llenar?', style: 'promo', eyebrow: 'Última hora', cta: 'Lo quiero',
    icon: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2',
    items: [
      { label: 'Hoy, 17:30 · Manicura semipermanente', meta: 'Con Ana · 40 min', price: '20 €', title: 'Hoy a las 17:30', subtitle: 'Manicura semipermanente con Ana', theme: 'unas', vars: { name: 'manicura semipermanente', day: 'hoy', time: '17:30', pro: 'Ana' } },
      { label: 'Mañana, 10:00 · Limpieza facial', meta: 'Con Carmen · 60 min', price: '-20%', title: 'Mañana a las 10:00', subtitle: 'Limpieza facial profunda con Carmen', theme: 'facial', vars: { name: 'limpieza facial', day: 'mañana', time: '10:00', pro: 'Carmen' } },
      { label: 'Viernes, 19:00 · Lifting de pestañas', meta: 'Con Lucía · 45 min', price: '36 €', title: 'Viernes a las 19:00', subtitle: 'Lifting de pestañas con Lucía', theme: 'pestanas', vars: { name: 'lifting de pestañas', day: 'el viernes', time: '19:00', pro: 'Lucía' } },
    ],
  },
  {
    id: 'equipo', label: 'Equipo', desc: 'Presenta a una profesional', note: '3 profesionales', question: '¿A quién quieres presentar?', style: 'editorial', eyebrow: 'Nuestro equipo', cta: 'Reservar cita',
    icon: 'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6',
    items: [
      { label: 'Lucía Martín', meta: 'Cejas y pestañas', price: '', title: 'Conoce a Lucía', subtitle: 'Especialista en cejas y pestañas', cta: 'Reserva con Lucía', theme: 'equipo', vars: { name: 'Lucía', job: 'especialista en cejas y pestañas' } },
      { label: 'Carmen Ruiz', meta: 'Facial y corporal', price: '', title: 'Conoce a Carmen', subtitle: 'Tratamientos faciales y corporales a medida', cta: 'Reserva con Carmen', theme: 'equipo', vars: { name: 'Carmen', job: 'especialista en facial y corporal' } },
      { label: 'Ana Gil', meta: 'Manicura y pedicura', price: '', title: 'Conoce a Ana', subtitle: 'Manicura, pedicura y nail art', cta: 'Reserva con Ana', theme: 'equipo', vars: { name: 'Ana', job: 'especialista en manicura y pedicura' } },
    ],
  },
  {
    id: 'regalo', label: 'Regalo', desc: 'Tarjeta o bono para regalar', note: '2 opciones para regalar', question: '¿Qué quieres que regalen?', style: 'minimal', eyebrow: 'Tarjeta regalo', cta: 'Regalar',
    icon: 'M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8C10 4 6 4 6 6.5S9 8 12 8zM12 8c2-4 6-4 6-1.5S15 8 12 8z',
    items: [
      { label: 'Tarjeta regalo', meta: 'Importe libre, para cualquier tratamiento', price: 'Desde 30 €', title: 'Regala un rato de calma', subtitle: 'Para cualquier tratamiento del centro', theme: 'temporada', vars: { name: 'una tarjeta regalo' } },
      { label: 'Limpieza facial profunda', meta: '60 min · Para regalar', price: '55 €', title: 'Regala una limpieza facial', subtitle: '60 min de cuidado para quien tú quieras', theme: 'facial', vars: { name: 'una limpieza facial' } },
    ],
  },
];

export const STYLES: { id: StyleId; label: string }[] = [
  { id: 'soft', label: 'Degradado suave' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'promo', label: 'Promo fuerte' },
  { id: 'minimal', label: 'Minimal tinta' },
  { id: 'card', label: 'Story card' },
  { id: 'luxe', label: 'Luxe oscuro' },
];

export const FORMATS: { id: FormatId; label: string; ratio: string; px: string; usage: string; H: number; iw: number; ih: number }[] = [
  { id: 'story', label: 'Vertical 9:16', ratio: '9:16', px: '1080 × 1920 px', usage: 'Stories de Instagram y estados de WhatsApp', H: 1920, iw: 9, ih: 15 },
  { id: 'square', label: 'Cuadrado 1:1', ratio: '1:1', px: '1080 × 1080 px', usage: 'Posts, chats de WhatsApp y email', H: 1080, iw: 13, ih: 13 },
  { id: 'portrait', label: 'Retrato 4:5', ratio: '4:5', px: '1080 × 1350 px', usage: 'Feed de Instagram y email', H: 1350, iw: 11, ih: 14 },
];
export const FORMAT_H: Record<FormatId, number> = { story: 1920, square: 1080, portrait: 1350 };

// TODO(backend): banco de imágenes real por temáticas. Hoy son placeholders (degradado + nombre de la foto que iría).
export const THEMES: { id: string; label: string; tones: [string, string]; items: string[] }[] = [
  { id: 'facial', label: 'Facial', tones: ['#EED8CB', '#C08C76'], items: ['Mascarilla facial', 'Limpieza con vapor', 'Sérum sobre la piel', 'Masaje facial', 'Rodillo de jade', 'Cabina facial'] },
  { id: 'unas', label: 'Uñas', tones: ['#F0D2D6', '#B57C86'], items: ['Manicura en curso', 'Esmaltes de color', 'Manos con anillos', 'Nail art', 'Pedicura', 'Lima y cutícula'] },
  { id: 'pestanas', label: 'Cejas y pestañas', tones: ['#E3D6CC', '#8C7464'], items: ['Lifting de pestañas', 'Diseño de cejas', 'Mirada de cerca', 'Laminado de cejas', 'Tinte de pestañas', 'Herramientas'] },
  { id: 'corporal', label: 'Corporal', tones: ['#EADBC8', '#B0916F'], items: ['Presoterapia', 'Tratamiento reductor', 'Exfoliación', 'Envoltura', 'Piernas', 'Cabina corporal'] },
  { id: 'depilacion', label: 'Depilación', tones: ['#EFE2D8', '#BE9F8C'], items: ['Láser diodo', 'Piel suave', 'Cera', 'Piernas', 'Axilas', 'Equipo láser'] },
  { id: 'spa', label: 'Spa y masajes', tones: ['#D6DFD3', '#879C89'], items: ['Masaje de espalda', 'Piedras calientes', 'Aceites', 'Toallas y velas', 'Masaje de pies', 'Sala de relax'] },
  { id: 'centro', label: 'El centro', tones: ['#E2DCD4', '#958A80'], items: ['Recepción', 'Cabina', 'Escaparate', 'Productos', 'Decoración', 'Fachada'] },
  { id: 'equipo', label: 'Equipo', tones: ['#E6D9D2', '#9C8478'], items: ['Retrato en cabina', 'Retrato sonriendo', 'Trabajando', 'Equipo completo', 'Con clienta', 'Manos expertas'] },
  { id: 'temporada', label: 'Temporada', tones: ['#E9CFCF', '#9E5F62'], items: ['Navidad', 'San Valentín', 'Día de la Madre', 'Verano', 'Black Friday', 'Vuelta a la rutina'] },
];

export const IMAGES: Record<string, BankImage> = (() => {
  const ang = [150, 205, 120, 175, 235, 95];
  const pos = ['28% 30%', '72% 24%', '34% 72%', '76% 66%', '50% 42%', '22% 78%'];
  const out: Record<string, BankImage> = {};
  THEMES.forEach((t) =>
    t.items.forEach((label, i) => {
      const [a, b] = i % 2 ? [t.tones[1], t.tones[0]] : t.tones;
      out[`${t.id}-${i}`] = {
        id: `${t.id}-${i}`, theme: t.id, label,
        bg: `radial-gradient(60% 55% at ${pos[i]}, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%), linear-gradient(${ang[i]}deg, ${a} 0%, ${b} 100%)`,
      };
    }),
  );
  return out;
})();

export const ELEMENTS: [ElementKey, string, string][] = [
  ['seal', 'Sello', 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M7.5 12a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0'],
  ['underline', 'Subrayado', 'M5 8h14M4 16c5-3 11-3 16-1'],
  ['sparkles', 'Destellos', 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z'],
  ['shape', 'Forma', 'M5 20v-9a7 7 0 0 1 14 0v9z'],
  ['frame', 'Marco', 'M4 4h16v16H4zM7.5 7.5h9v9h-9z'],
];

export const SEAL_TEXT: Record<TypeId, string> = { bono: 'Ahorra', servicio: 'Nuevo', reserva: '24/7', ultima: 'Solo hoy', equipo: 'Reserva ya', regalo: 'Regalo' };

/** Combinación de elementos «de diseñadora» por estilo (máx. 2) */
export const REC: Record<StyleId, ElementKey[]> = { soft: ['sparkles', 'shape'], editorial: ['shape'], promo: ['seal', 'shape'], minimal: ['shape', 'underline'], card: ['sparkles', 'shape'], luxe: ['sparkles'] };
export const ALT: Record<StyleId, ElementKey[]> = { soft: ['underline', 'shape'], editorial: ['underline', 'frame'], promo: ['sparkles', 'shape'], minimal: ['frame', 'sparkles'], card: ['frame', 'sparkles'], luxe: ['frame', 'shape'] };

export const STYLE_TONE: Record<StyleId, Tone> = { soft: 'cercano', card: 'cercano', promo: 'directo', minimal: 'directo', editorial: 'premium', luxe: 'premium' };
export const TONES: [Tone, string, string][] = [
  ['cercano', 'Cercano', 'Cálido, de tú, con mimo'],
  ['directo', 'Directo', 'Corto y claro, empuja a reservar'],
  ['premium', 'Premium', 'Sobrio, pocas palabras'],
];

/** Catálogo activo (demo o el del centro inyectado por MarketingStudio). */
let ACTIVE: CreativeType[] = TYPES;

export function setActiveCatalog(types: CreativeType[]) {
  ACTIVE = types.length ? types : TYPES;
}

export function getCatalog(): CreativeType[] {
  return ACTIVE;
}

export const getType = (id: TypeId) => ACTIVE.find((t) => t.id === id) || ACTIVE[0] || TYPES[0];
export const suggestTheme = (type: TypeId, idx: number) => {
  const t = getType(type);
  return (t.items[idx] || t.items[0])?.theme || 'centro';
};

export function recommendElements(style: StyleId, type: TypeId, keys?: ElementKey[]): Elements {
  const e: Elements = { seal: false, underline: false, sparkles: false, shape: false, frame: false, sealText: SEAL_TEXT[type] || 'Nuevo' };
  (keys || REC[style] || []).forEach((k) => ((e as unknown as Record<string, boolean>)[k] = true));
  if (['ultima', 'bono', 'regalo'].includes(type) && style !== 'editorial') { e.seal = true; e.sparkles = false; }
  if (type === 'equipo') e.underline = true;
  return e;
}

export function fieldsFor(typeId: TypeId, idx: number): Fields {
  const t = getType(typeId), it = t.items[idx] || t.items[0];
  return { eyebrow: it?.eyebrow || t.eyebrow, title: it?.title || t.label, subtitle: it?.subtitle || '', price: it?.price || '', cta: it?.cta || t.cta };
}
