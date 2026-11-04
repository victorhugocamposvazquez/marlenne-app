'use server';

import { requireRole } from '@/lib/require-session';
import {
  pickStockQuery,
  stockOrientation,
  type StockPhoto,
} from '@/lib/marketing/stock';
import type { FormatId, TypeId } from '@/lib/marketing/types';

const KINDS: TypeId[] = ['bono', 'servicio', 'reserva', 'ultima', 'equipo', 'regalo'];
const FORMATS: FormatId[] = ['story', 'square', 'portrait'];

type PixabayHit = {
  id: number;
  pageURL: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  user: string;
  user_id: number;
  tags: string;
};

export async function searchStockPhotos(input: {
  kind: TypeId;
  format: FormatId;
  queryIndex?: number;
}): Promise<
  | { ok: true; photos: StockPhoto[]; query: string; configured: true }
  | { ok: true; photos: []; query: string; configured: false; hint: string }
  | { ok: false; error: string }
> {
  await requireRole('admin');

  if (!KINDS.includes(input.kind)) return { ok: false, error: 'Tipo no válido' };
  if (!FORMATS.includes(input.format)) return { ok: false, error: 'Formato no válido' };

  const key = process.env.PIXABAY_API_KEY?.trim();
  const query = pickStockQuery(input.kind, input.queryIndex ?? 0);
  if (!key) {
    return {
      ok: true,
      photos: [],
      query,
      configured: false,
      hint: 'Falta PIXABAY_API_KEY (gratis en pixabay.com/api/docs/)',
    };
  }

  const orientation = stockOrientation(input.format);
  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', key);
  url.searchParams.set('q', query);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('orientation', orientation);
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('per_page', '12');
  url.searchParams.set('min_width', '1080');
  url.searchParams.set(
    'editors_choice',
    input.queryIndex && input.queryIndex % 2 === 1 ? 'true' : 'false',
  );

  const res = await fetch(url.toString(), {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[pixabay]', res.status, body.slice(0, 200));
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Clave de Pixabay no válida' };
    }
    if (res.status === 429) {
      return { ok: false, error: 'Límite de Pixabay: prueba en un rato' };
    }
    return { ok: false, error: 'No se pudieron cargar fotos' };
  }

  const data = (await res.json()) as { hits?: PixabayHit[] };
  const photos: StockPhoto[] = (data.hits ?? []).map(h => ({
    provider: 'pixabay' as const,
    id: h.id,
    thumbUrl: h.webformatURL || h.previewURL,
    srcUrl: h.largeImageURL || h.webformatURL,
    alt: (h.tags || query).split(',')[0]?.trim() || query,
    photographer: h.user || 'Pixabay',
    photographerUrl: `https://pixabay.com/users/${encodeURIComponent(h.user)}-${h.user_id}/`,
    pageUrl: h.pageURL,
  }));

  return { ok: true, photos, query, configured: true };
}
