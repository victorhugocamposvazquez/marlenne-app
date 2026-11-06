import { fetchInstagramMedia } from '@/lib/web/instagram';
import { fetchPlaceReviews } from '@/lib/web/places';
import type { SalonSiteConfig, SiteFeeds } from '@/lib/web/site-config';

/** Rellena caché IG / Places según extras activos (sin fallar si faltan APIs). */
export async function refreshSiteFeeds(config: SalonSiteConfig): Promise<SiteFeeds> {
  const prev = config.feeds || {};
  const next: SiteFeeds = { ...prev };
  const now = new Date().toISOString();

  if (config.fx.insta) {
    const ig = await fetchInstagramMedia(9);
    if (ig.ok && ig.configured && ig.media.length) {
      next.ig = ig.media;
      next.igFetchedAt = now;
    } else if (!prev.ig?.length) {
      next.ig = [];
      next.igFetchedAt = now;
    }
  }

  if (config.fx.reviews && (config.fx.gUrl || '').trim()) {
    const place = await fetchPlaceReviews(config.fx.gUrl, 5);
    if (place.ok && place.configured && place.place) {
      next.place = place.place;
      next.placeFetchedAt = now;
    }
  }

  return next;
}
