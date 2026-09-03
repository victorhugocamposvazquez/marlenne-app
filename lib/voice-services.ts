/**
 * Servicios por voz: familia («Vacumterapia») + variante («de una hora», «con cavitación»).
 * El catálogo tiene nombres parecidos; aquí se decide con la duración real, no con el texto.
 */

import { CATEGORIES } from '@/lib/categories';
import { fold, hearService, matchCategory, scoreService } from '@/lib/voice';

export type SvcLike = { name: string; duration_min: number; category: string | null };

export type VariantSpec = {
  durationMin: number | null;
  cavit: boolean | null;
  gratis: boolean;
  size: 'short' | 'long' | 'base' | null;
  rest: string;
};

export type ServiceResolution<T> =
  | { kind: 'one'; service: T }
  | { kind: 'variants'; base: string; options: T[] }
  | { kind: 'list'; title: string | null; options: T[]; families: string[] }
  | { kind: 'none' };

/** «D. Láser - 15 min» → «D. Láser». «Vacumterapia + cavitación» → «Vacumterapia». */
export function serviceBase(name: string) {
  return name.replace(/\s+[-+–]\s+.*$/, '').trim();
}

const DURATIONS: [RegExp, number][] = [
  [/\b(?:una |1 )?hora y media\b|\b1 ?h ?30(?: min(?:utos)?)?\b|\b90 ?min(?:utos)?\b|\bnoventa(?: min(?:utos)?)?\b/, 90],
  [/\b(?:tres|3) ?h(?:oras)?\b|\b180 ?min(?:utos)?\b/, 180],
  [/\b(?:dos|2) ?h(?:oras)?\b|\b120 ?min(?:utos)?\b/, 120],
  [/\b(?:una|un|1) ?h(?:ora)?\b|\b60 ?min(?:utos)?\b|\bsesenta(?: min(?:utos)?)?\b/, 60],
  [/\btres cuartos(?: de hora)?\b|\b45 ?min(?:utos)?\b|\bcuarenta y cinco(?: min(?:utos)?)?\b|\b45\b/, 45],
  [/\bmedia hora\b|\b30 ?min(?:utos)?\b|\btreinta(?: min(?:utos)?)?\b|\bmedia\b|\b30\b/, 30],
  [/\bcuarto de hora\b|\b15 ?min(?:utos)?\b|\bquince(?: min(?:utos)?)?\b|\b15\b/, 15],
];

const FILLER = /\b(la|el|de|del|una|un|uno|lo|los|las|que|pues|mira|vale|esa|ese|esta|este|mejor|quiero|ponle|hacemos|le|para|ella|tratamiento|sesion|con|y|o|dale|venga|mm+|eh+)\b/g;

/** Qué variante ha dicho y qué queda como nombre del tratamiento. */
export function parseVariantSpec(query: string): VariantSpec {
  let t = hearService(query).replace(/[¿?¡!.,«»"'\-+–/]/g, ' ').replace(/\s+/g, ' ').trim();
  let durationMin: number | null = null;
  let lastAt = -1;
  for (const [re, mins] of DURATIONS) {
    const g = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = g.exec(t))) {
      if (m.index >= lastAt) {
        lastAt = m.index;
        durationMin = mins;
      }
    }
    t = t.replace(g, ' ');
  }
  const gen = t.match(/\b(\d{1,3}) ?min(?:utos)?\b/);
  if (gen) {
    durationMin = Number(gen[1]);
    t = t.replace(gen[0], ' ');
  }

  let cavit: boolean | null = null;
  if (/\bsin cavit\w*/.test(t)) {
    cavit = false;
    t = t.replace(/\bsin cavit\w*/, ' ');
  } else if (/\b(con|mas|y|\+)\s*(la )?cavit\w*/.test(t)) {
    cavit = true;
    t = t.replace(/\b(con|mas|y|\+)\s*(la )?cavit\w*/, ' ');
  }

  let gratis = false;
  if (/\bgratuit\w*|\bgratis\b/.test(t)) {
    gratis = true;
    t = t.replace(/\bgratuit\w*|\bgratis\b/, ' ');
  }

  let size: VariantSpec['size'] = null;
  if (/\b(corta|cortita|pequena|rapida|breve|mas corta|la menor)\b/.test(t)) size = 'short';
  else if (/\b(larga|grande|completa|entera|mas larga|la mayor)\b/.test(t)) size = 'long';
  else if (/\b(normal|basica|sencilla|simple|sola|de siempre|estandar|la que sea|cualquiera|da igual|igual|la de siempre)\b/.test(t)) size = 'base';
  t = t
    .replace(/\b(corta|cortita|pequena|rapida|breve|mas corta|la menor|larga|grande|completa|entera|mas larga|la mayor|normal|basica|sencilla|simple|sola|de siempre|estandar|la que sea|cualquiera|da igual|igual)\b/g, ' ');

  const rest = t.replace(FILLER, ' ').replace(/\s+/g, ' ').trim();
  // «vacumterapia cavitación» es la variante; «cavitación» a secas, el tratamiento.
  if (cavit === null && /cavit/.test(rest) && rest.replace(/cavit\w*/, '').trim()) {
    return { durationMin, cavit: true, gratis, size, rest: rest.replace(/cavit\w*/, ' ').replace(/\s+/g, ' ').trim() };
  }
  return { durationMin, cavit, gratis, size, rest };
}

function groupFamilies<T extends SvcLike>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const base = serviceBase(r.name);
    const key = fold(base);
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return [...map.values()];
}

function familyScore<T extends SvcLike>(fam: T[], rest: string) {
  const base = serviceBase(fam[0].name);
  let best = scoreService(base, rest);
  for (const s of fam) best = Math.max(best, scoreService(s.name, rest));
  return best;
}

function applySpec<T extends SvcLike>(members: T[], spec: VariantSpec): T[] {
  let out = members;
  if (spec.cavit === true) {
    const c = out.filter(s => /cavit/i.test(s.name) && !/cavit/i.test(serviceBase(s.name)));
    if (c.length) out = c;
  } else if (spec.cavit === false) {
    const c = out.filter(s => !/cavit/i.test(s.name) || /cavit/i.test(serviceBase(s.name)));
    if (c.length) out = c;
  }
  if (spec.gratis) {
    const g = out.filter(s => /gratuit/i.test(s.name));
    if (g.length) out = g;
  }
  if (spec.durationMin !== null) {
    const d = out.filter(s => s.duration_min === spec.durationMin);
    if (d.length) out = d;
  }
  if (out.length > 1 && spec.size) {
    if (spec.size === 'short') {
      const min = Math.min(...out.map(s => s.duration_min));
      out = out.filter(s => s.duration_min === min);
    } else if (spec.size === 'long') {
      const max = Math.max(...out.map(s => s.duration_min));
      out = out.filter(s => s.duration_min === max);
    } else {
      const plain = out.filter(s => fold(s.name) === fold(serviceBase(s.name)));
      if (plain.length) out = plain;
      else {
        const min = Math.min(...out.map(s => s.duration_min));
        out = out.filter(s => s.duration_min === min);
      }
    }
  }
  return out;
}

function finish<T extends SvcLike>(members: T[], spec: VariantSpec, title: string | null = null): ServiceResolution<T> {
  const picked = applySpec(members, spec);
  if (picked.length === 1) return { kind: 'one', service: picked[0] };
  if (picked.length === 0) return { kind: 'none' };
  const bases = new Set(picked.map(s => fold(serviceBase(s.name))));
  if (bases.size === 1) return { kind: 'variants', base: serviceBase(picked[0].name), options: picked };
  return {
    kind: 'list',
    title,
    options: picked,
    families: [...new Map(picked.map(s => [fold(serviceBase(s.name)), serviceBase(s.name)])).values()],
  };
}

function categoryLabel(cat: string) {
  return CATEGORIES[cat]?.label ?? cat;
}

/**
 * Busca la familia en `pool`. La categoría («facial», «láser») solo se mira sobre
 * todo el catálogo: dentro de unas opciones ya ofrecidas no tiene sentido.
 */
function resolveIn<T extends SvcLike>(pool: T[], spec: VariantSpec, withCategory: boolean): ServiceResolution<T> | null {
  const rest = spec.rest;
  if (!rest || rest.replace(/[^a-z0-9ñ]/g, '').length < 3) return null;

  const fams = groupFamilies(pool);
  const ranked = fams
    .map(fam => ({ fam, score: familyScore(fam, rest) }))
    .filter(x => x.score >= 40)
    .sort((a, b) => b.score - a.score);

  if (ranked.length && ranked[0].score >= 100) {
    const top = ranked.filter(x => x.score >= 100);
    if (top.length === 1) return finish(top[0].fam, spec);
  }
  if (ranked.length && ranked[0].score >= 55) {
    const close = ranked.filter(x => x.score >= ranked[0].score - 8);
    if (close.length === 1) return finish(close[0].fam, spec);
  }

  const cat = withCategory ? matchCategory(rest) : null;
  if (cat) {
    const inCat = pool.filter(s => s.category === cat);
    if (inCat.length) return finish(inCat, spec, categoryLabel(cat));
  }

  if (ranked.length) {
    const close = ranked.filter(x => x.score >= ranked[0].score - 8);
    if (close.length === 1) return finish(close[0].fam, spec);
    return finish(close.flatMap(x => x.fam), spec);
  }
  return null;
}

/**
 * Qué servicio ha pedido. `within` son las opciones que se acaban de ofrecer:
 * ahí «la de una hora» o «con cavitación» bastan.
 */
export function resolveService<T extends SvcLike>(
  all: T[],
  query: string,
  within: T[] | null = null,
): ServiceResolution<T> {
  const q = fold(query).trim();
  if (!q) return { kind: 'none' };

  // Nombre completo tal cual (chip en pantalla). Si es la familia a secas y hay variantes, se pregunta.
  const exact = all.filter(s => fold(s.name) === q);
  if (exact.length === 1) {
    const kin = all.filter(s => fold(serviceBase(s.name)) === fold(serviceBase(exact[0].name)));
    if (kin.length === 1 || fold(serviceBase(exact[0].name)) !== q) return { kind: 'one', service: exact[0] };
  }

  const spec = parseVariantSpec(query);
  const hasVariant = spec.durationMin !== null || spec.cavit !== null || spec.size !== null || spec.gratis;

  if (spec.rest) {
    const hit = within?.length
      ? resolveIn(within, spec, false) ?? resolveIn(all, spec, true)
      : resolveIn(all, spec, true);
    if (hit) return hit;
    // Ha dicho algo que no existe pero sí una variante: sigue dentro de las opciones.
    if (within?.length && hasVariant) return finish(within, spec);
    return { kind: 'none' };
  }

  if (!hasVariant) return { kind: 'none' };
  if (within?.length) return finish(within, spec);
  // «Con cavitación» a secas, sin opciones delante.
  if (spec.cavit === true) {
    const plus = all.filter(s => /cavit/i.test(s.name) && !/cavit/i.test(serviceBase(s.name)));
    if (plus.length === 1) return { kind: 'one', service: plus[0] };
  }
  return { kind: 'none' };
}

const DURATION_LABEL: Record<number, string> = {
  15: 'de quince minutos',
  30: 'de media hora',
  45: 'de tres cuartos de hora',
  60: 'de una hora',
  90: 'de hora y media',
  120: 'de dos horas',
  180: 'de tres horas',
};

export function durationLabel(min: number) {
  return DURATION_LABEL[min] ?? `de ${min} minutos`;
}

/** «de media hora», «con cavitación», «gratuita». Cómo se distingue dentro de la familia. */
export function variantLabel(s: SvcLike, siblings: SvcLike[]) {
  const base = serviceBase(s.name);
  const own = (x: SvcLike) => {
    if (/cavit/i.test(x.name) && !/cavit/i.test(serviceBase(x.name))) return 'con cavitación';
    if (/gratuit/i.test(x.name)) return 'gratuita';
    return durationLabel(x.duration_min);
  };
  const mine = own(s);
  const clash = siblings.some(o => o !== s && own(o) === mine);
  if (!clash) return mine;
  const suffix = s.name.slice(base.length).replace(/^\s*[-+–]\s*/, '').trim();
  return suffix ? suffix.toLowerCase() : s.name;
}

export const VARIANT_LABELS = [
  ...Object.values(DURATION_LABEL),
  'con cavitación',
  'gratuita',
];

export function joinO(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} o ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`;
}

/** Pregunta de variante. Pantalla: con familia. Oído: solo las opciones. */
export function variantQuestion<T extends SvcLike>(base: string, options: T[]) {
  const labels = options.map(o => variantLabel(o, options));
  const ear = `¿${joinO(labels).replace(/^./, c => c.toUpperCase())}?`;
  return { say: `${base}: ${ear.toLowerCase().replace(/^¿/, '¿')}`, ear, labels };
}
