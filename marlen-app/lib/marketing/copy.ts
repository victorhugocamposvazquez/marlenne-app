import bank from './textos-marketing.json';
import type { CatalogItem, CreativeType, Fields, Tone } from './types';

type Slot = 'kicker' | 'headline' | 'subline' | 'cta';
type Bank = Record<string, Record<Slot, Record<Tone, string[]>>> & { _meta: { limits: Record<Slot, number> } };
const B = bank as unknown as Bank;

export const SLOT: Record<keyof Omit<Fields, 'price'>, Slot> = { eyebrow: 'kicker', title: 'headline', subtitle: 'subline', cta: 'cta' };
export const LIMITS: Record<keyof Omit<Fields, 'price'>, number> = {
  eyebrow: B._meta.limits.kicker, title: B._meta.limits.headline, subtitle: B._meta.limits.subline, cta: B._meta.limits.cta,
};
export type TextField = keyof typeof SLOT;

/** Rellena {placeholders}. Devuelve null si falta algún dato. Capitaliza solo la primera letra. */
export function fill(str: string, vars: Record<string, string | number>): string | null {
  let miss = false;
  const out = str.replace(/\{(\w+)\}/g, (_m, k) => {
    const v = vars[k];
    if (v == null || v === '') { miss = true; return ''; }
    return String(v);
  });
  if (miss) return null;
  return out.replace(/^([^A-Za-zÀ-ÿ0-9]*)([a-zà-ÿ])/, (_m, p, c) => p + c.toUpperCase());
}

export function withClientVars(item: CatalogItem, clientName?: string | null): CatalogItem {
  const client = (clientName || '').trim().split(/\s+/)[0] || '';
  if (!client) return item;
  return { ...item, vars: { ...item.vars, client } };
}

export function pickLine(opts: {
  type: CreativeType; item: CatalogItem; tone: Tone; field: TextField; salon: string; exclude?: string; avoid?: string[];
}): { raw: string; txt: string } | null {
  const pool = B[opts.type.bank || opts.type.id];
  if (!pool) return null;
  const slot = pool[SLOT[opts.field]] || ({} as Record<Tone, string[]>);
  const vars = { salon: opts.salon, ...(opts.item.vars || {}) };
  const lim = LIMITS[opts.field];
  const build = (list: string[]) =>
    list
      .map((raw) => ({ raw, txt: fill(raw, vars) }))
      .filter((c): c is { raw: string; txt: string } => !!c.txt && c.txt.length <= lim && c.txt !== opts.exclude && !(opts.avoid || []).some((k) => c.raw.includes('{' + k + '}')));
  let c = build(slot[opts.tone] || []);
  if (!c.length) c = build(([] as string[]).concat(...Object.values(slot)));
  return c.length ? c[Math.floor(Math.random() * c.length)] : null;
}

const norm = (x: string) => (x || '').toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');

/** Propone antetítulo, titular, subtítulo y botón coherentes. El precio no se toca. */
export function improveAll(type: CreativeType, item: CatalogItem, tone: Tone, current: Fields, salon: string): Fields {
  const f = { ...current };
  const base = { type, item, tone, salon };
  const h = pickLine({ ...base, field: 'title', exclude: current.title });
  if (h) f.title = h.txt;
  const keys = h ? (h.raw.match(/\{(\w+)\}/g) || []).map((k) => k.slice(1, -1)).filter((k) => k !== 'salon') : [];
  for (let n = 0; n < 6; n++) {
    const s = pickLine({ ...base, field: 'subtitle', exclude: current.subtitle, avoid: keys });
    if (s && norm(s.txt) !== norm(f.title)) { f.subtitle = s.txt; break; }
  }
  const k = pickLine({ ...base, field: 'eyebrow', exclude: current.eyebrow });
  if (k) f.eyebrow = k.txt;
  const c = pickLine({ ...base, field: 'cta', exclude: current.cta });
  if (c) f.cta = c.txt;
  return f;
}
