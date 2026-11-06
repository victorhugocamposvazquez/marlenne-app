/** Une catálogo vivo + config guardada → props de <WebSite>. */

import { tplOf, lookOf, palettesFor, ICONS, SERVICE_MEDIA, bankImg } from '@/lib/web/data';
import { themeForService } from '@/lib/web/from-salon';
import type { SalonSiteConfig } from '@/lib/web/site-config';
import type { Service, SiteProps, SiteService } from '@/lib/web/types';

export function buildSiteProps(input: {
  config: SalonSiteConfig;
  salon: string;
  logo?: string | null;
  brandColor: string;
  bookingUrl?: string | null;
  bookingEmbedUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  siteSlug?: string | null;
  showFloat?: boolean;
  /** Catálogo vivo (opcional): refresca nombre/precio/meta. */
  liveSvcs?: Service[];
  team?: [string, string][];
}): SiteProps {
  const c = input.config;
  const T = tplOf(c.tplId);
  const pals = palettesFor(T, input.brandColor);
  const P = pals.find(p => p.id === c.palId) || pals[1] || pals[0]!;
  const media = c.svcMedia || (T.svc === 'cards' ? 'photo' : 'none');

  const byId = new Map((c.svcs || []).map(s => [s.id, s]));
  const merged: Service[] = (input.liveSvcs?.length ? input.liveSvcs : c.svcs).map(live => {
    const saved = byId.get(live.id);
    return {
      ...live,
      pub: saved?.pub ?? live.pub,
      nov: saved?.nov ?? live.nov,
      // bookable_online (agenda / BD) manda; el toggle de la web escribe ahí al guardar.
      book: live.book,
    };
  });

  const imgOf = (s: Service) => {
    if (c.svcImg[s.id]) return c.svcImg[s.id]!.bg;
    const th = themeForService(s.name);
    const demo = SERVICE_MEDIA[s.id];
    return bankImg(demo ? demo[0] : th, demo ? demo[1] : 0).bg;
  };
  const iconOf = (s: Service) =>
    c.svcIcon[s.id] || ICONS[(SERVICE_MEDIA[s.id] || ['', 0, 0])[2] ?? 0]?.[1] || ICONS[0]![1];

  const svcs: SiteService[] = merged.map(s => ({
    ...s,
    img: imgOf(s),
    icon: iconOf(s),
  }));

  return {
    look: lookOf(T),
    pal: P,
    txt: c.txt,
    sec: c.sec,
    fx: c.fx,
    svcMedia: media,
    iconStyle: c.iconStyle,
    salon: input.salon,
    logo: input.logo || undefined,
    bookingUrl: input.bookingUrl || undefined,
    bookingEmbedUrl: input.bookingEmbedUrl || undefined,
    phone: input.phone,
    address: input.address,
    team: input.team,
    hours: c.hours || undefined,
    zone: c.zone || undefined,
    siteSlug: input.siteSlug || undefined,
    showFloat: input.showFloat !== false,
    svcs,
    photos: {
      hero: c.photos.hero,
      about: c.photos.about,
      team: (c.photos.team || []).map(p => (p ? p.bg : null)),
    },
    igMedia: c.feeds?.ig || [],
    place: c.feeds?.place || null,
    giftAmounts: c.giftAmounts || [30, 50, 100],
  };
}
