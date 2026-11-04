/** Stock fotos (Pixabay). Sin fetch aquí. */

import queries from '@/lib/marketing/stock-queries.json';
import type { FormatId, TypeId } from '@/lib/marketing/types';

export type StockProvider = 'pixabay' | 'pexels';

export type StockPhoto = {
  provider: StockProvider;
  id: number;
  thumbUrl: string;
  srcUrl: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pageUrl: string;
};

const TYPE_QUERY_KEY: Record<TypeId, string> = {
  bono: 'bono',
  servicio: 'servicio',
  reserva: 'reserva',
  ultima: 'hueco',
  equipo: 'equipo',
  regalo: 'regalo',
};

export function stockQueriesFor(kind: TypeId): string[] {
  const key = TYPE_QUERY_KEY[kind] || 'servicio';
  return (queries as Record<string, string[]>)[key] ?? ['beauty spa'];
}

export function pickStockQuery(kind: TypeId, salt = 0): string {
  const list = stockQueriesFor(kind);
  return list[Math.abs(salt) % list.length] ?? list[0]!;
}

/** Pixabay: horizontal | vertical. */
export function stockOrientation(format: FormatId): 'horizontal' | 'vertical' {
  if (format === 'square') return 'vertical';
  return 'vertical';
}

export function isAllowedStockImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return (
      h === 'cdn.pixabay.com' ||
      h === 'pixabay.com' ||
      h.endsWith('.pixabay.com') ||
      h === 'images.pexels.com' ||
      h.endsWith('.pexels.com')
    );
  } catch {
    return false;
  }
}

export function stockProxyPath(srcUrl: string): string {
  return `/api/marketing/stock-image?src=${encodeURIComponent(srcUrl)}`;
}

export function stockProviderLabel(provider: StockProvider | string | undefined): string {
  if (provider === 'pexels') return 'Pexels';
  return 'Pixabay';
}
