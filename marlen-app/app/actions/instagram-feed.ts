'use server';

import { fetchInstagramMedia, instagramConfigured } from '@/lib/web/instagram';
import type { IgMedia } from '@/lib/web/instagram';
import { parseInstagramUser } from '@/lib/web/extras';

/** Preview / refresco del feed para el estudio (por @usuario). */
export async function loadInstagramFeedPreview(rawUser: string): Promise<
  | { ok: true; media: IgMedia[]; configured: boolean; username: string }
  | { ok: false; error: string; configured: boolean; username: string | null }
> {
  const username = parseInstagramUser(rawUser);
  if (!username) {
    return { ok: false, error: 'Usuario de Instagram no válido', configured: instagramConfigured(), username: null };
  }
  const ig = await fetchInstagramMedia(9, { username });
  if (!ig.ok) {
    return { ok: false, error: ig.error, configured: true, username };
  }
  if (!ig.configured) {
    return { ok: true, media: [], configured: false, username };
  }
  return { ok: true, media: ig.media, configured: true, username };
}
