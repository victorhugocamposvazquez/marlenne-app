/** Google Places API (New) → reseñas (opcional). */

export type PlaceReview = {
  author: string;
  rating: number;
  text: string;
  relativeTime?: string;
  profilePhotoUrl?: string;
};

export type PlaceSnapshot = {
  placeId: string;
  name?: string;
  rating?: number;
  userRatingCount?: number;
  reviews: PlaceReview[];
  mapsUri?: string;
};

function apiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

export function placesConfigured(): boolean {
  return Boolean(apiKey());
}

/** Extrae place_id de URLs típicas de Google Maps / g.page. */
export function extractPlaceIdFromUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^[A-Za-z0-9_-]{20,}$/.test(url) && !url.includes('/')) return url;

  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const q = u.searchParams.get('place_id') || u.searchParams.get('query_place_id');
    if (q) return q;
    // /maps/place/.../data=...!1s0x...:0x... a veces; place_id en path raro
    const m = u.pathname.match(/place\/[^/]+\/([^/?#]+)/);
    if (m?.[1] && m[1].startsWith('ChI')) return m[1];
  } catch {
    /* ignore */
  }

  const chI = url.match(/(ChI[\w-]+)/);
  if (chI) return chI[1];
  return null;
}

export async function fetchPlaceReviews(
  placeIdOrUrl: string,
  maxReviews = 5,
): Promise<
  | { ok: true; place: PlaceSnapshot; configured: true }
  | { ok: true; place: null; configured: false; hint: string }
  | { ok: false; error: string; configured: boolean }
> {
  const key = apiKey();
  if (!key) {
    return {
      ok: true,
      place: null,
      configured: false,
      hint: 'Configura GOOGLE_PLACES_API_KEY',
    };
  }

  let placeId = extractPlaceIdFromUrl(placeIdOrUrl);
  if (!placeId) {
    // Text Search fallback con la URL / nombre
    const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri',
      },
      body: JSON.stringify({ textQuery: placeIdOrUrl, languageCode: 'es', maxResultCount: 1 }),
    });
    const searchJson = (await searchRes.json()) as {
      places?: { id?: string; displayName?: { text?: string }; rating?: number; userRatingCount?: number; googleMapsUri?: string }[];
      error?: { message?: string };
    };
    if (!searchRes.ok || !searchJson.places?.[0]?.id) {
      return {
        ok: false,
        configured: true,
        error: searchJson.error?.message || 'No se pudo resolver el lugar de Google',
      };
    }
    placeId = searchJson.places[0].id.replace(/^places\//, '');
  }

  const idPath = placeId.startsWith('places/') ? placeId : `places/${placeId}`;
  const res = await fetch(`https://places.googleapis.com/v1/${idPath}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'id,displayName,rating,userRatingCount,googleMapsUri,reviews',
    },
    next: { revalidate: 3600 },
  });
  const json = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    reviews?: {
      authorAttribution?: { displayName?: string; photoUri?: string };
      rating?: number;
      text?: { text?: string };
      relativePublishTimeDescription?: string;
    }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, configured: true, error: json.error?.message || `Places HTTP ${res.status}` };
  }

  const reviews: PlaceReview[] = (json.reviews || [])
    .slice(0, maxReviews)
    .map(r => ({
      author: r.authorAttribution?.displayName || 'Cliente',
      rating: r.rating || 5,
      text: r.text?.text || '',
      relativeTime: r.relativePublishTimeDescription,
      profilePhotoUrl: r.authorAttribution?.photoUri,
    }))
    .filter(r => r.text.trim().length > 0);

  return {
    ok: true,
    configured: true,
    place: {
      placeId: (json.id || placeId).replace(/^places\//, ''),
      name: json.displayName?.text,
      rating: json.rating,
      userRatingCount: json.userRatingCount,
      reviews,
      mapsUri: json.googleMapsUri,
    },
  };
}
