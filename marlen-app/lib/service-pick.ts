import { catStyle } from '@/lib/categories';
import { fold } from '@/lib/voice';
import type { ServiceOption } from '@/lib/types';

export type ServicePickSection = {
  key: string;
  title: string;
  items: ServiceOption[];
};

function matches(s: ServiceOption, q: string) {
  if (!q) return true;
  const cat = fold(catStyle(s.category, { label: s.category_label }).label);
  return fold(s.name).includes(q) || cat.includes(q);
}

/** Último y más usados arriba; el resto por categoría. La búsqueda filtra todo. */
export function servicePickSections(
  services: ServiceOption[],
  opts: { lastId?: string | null; counts?: Record<string, number>; query?: string; frequentN?: number } = {},
): ServicePickSection[] {
  const q = fold(opts.query ?? '');
  const filtered = services.filter(s => matches(s, q));
  const byId = new Map(filtered.map(s => [s.id, s]));
  const last = opts.lastId ? byId.get(opts.lastId) : undefined;
  const frequentN = opts.frequentN ?? 5;
  const frequent = Object.entries(opts.counts ?? {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => byId.get(id))
    .filter((s): s is ServiceOption => !!s && s.id !== last?.id)
    .slice(0, frequentN);

  const sections: ServicePickSection[] = [];
  if (last) sections.push({ key: 'last', title: 'Último', items: [last] });
  if (frequent.length) sections.push({ key: 'frequent', title: 'Más pedidos', items: frequent });

  const pinned = new Set(sections.flatMap(s => s.items.map(i => i.id)));
  const order: string[] = [];
  const by = new Map<string, ServiceOption[]>();
  for (const s of filtered) {
    if (pinned.has(s.id)) continue;
    if (!by.has(s.category)) {
      by.set(s.category, []);
      order.push(s.category);
    }
    by.get(s.category)!.push(s);
  }
  for (const id of order) {
    const items = by.get(id)!;
    const label = catStyle(id, { label: items[0]?.category_label, color: items[0]?.category_color }).label;
    sections.push({ key: id, title: label, items });
  }
  return sections;
}

/** Tira rápida: último + más pedidos, para scroll horizontal. */
export function serviceShortcuts(
  services: ServiceOption[],
  opts: { lastId?: string | null; counts?: Record<string, number>; n?: number } = {},
): ServiceOption[] {
  const n = opts.n ?? 8;
  const sections = servicePickSections(services, {
    lastId: opts.lastId,
    counts: opts.counts,
    frequentN: n,
  });
  const out: ServiceOption[] = [];
  for (const sec of sections) {
    if (sec.key !== 'last' && sec.key !== 'frequent') continue;
    out.push(...sec.items);
  }
  return out.slice(0, n);
}

/** Todos los servicios en tira: último y más pedidos primero. */
export function serviceChipOrder(
  services: ServiceOption[],
  opts: { lastId?: string | null; counts?: Record<string, number> } = {},
): ServiceOption[] {
  const head = serviceShortcuts(services, { ...opts, n: 8 });
  const seen = new Set(head.map(s => s.id));
  return [...head, ...services.filter(s => !seen.has(s.id))];
}
