import { dayKey } from '@/lib/time';
import type { ClientPack, PackTemplate } from '@/lib/types';

export function packRemaining(p: {
  sessions_total: number;
  sessions_done: number;
  reserved?: number;
}) {
  return Math.max(0, p.sessions_total - p.sessions_done - (p.reserved ?? 0));
}

export function packExpired(expiresAt: string | null, today = dayKey(new Date())) {
  return !!expiresAt && expiresAt < today;
}

export function packFitsService(p: { service_id: string | null }, serviceId: string) {
  return !p.service_id || p.service_id === serviceId;
}

export function packUsableBy(
  p: { owner_client_id: string; friend_client_id: string | null },
  clientId: string,
) {
  return p.owner_client_id === clientId || p.friend_client_id === clientId;
}

export function packIsOpen(p: {
  sessions_total: number;
  sessions_done: number;
  reserved?: number;
  expires_at: string | null;
}, today = dayKey(new Date())) {
  return packRemaining(p) > 0 && !packExpired(p.expires_at, today);
}

export function packLabel(p: {
  name: string;
  sessions_total: number;
  sessions_done: number;
  reserved?: number;
}) {
  const left = packRemaining(p);
  return `${p.name} · ${left} de ${p.sessions_total}`;
}

/** El que caduca antes, si empatan el que más se ha usado (FIFO). */
export function pickPackForService(packs: ClientPack[], clientId: string, serviceId: string) {
  const today = dayKey(new Date());
  const usable = packs.filter(p =>
    packUsableBy(p, clientId)
    && packFitsService(p, serviceId)
    && packIsOpen(p, today),
  );
  usable.sort((a, b) => {
    const ae = a.expires_at ?? '9999-12-31';
    const be = b.expires_at ?? '9999-12-31';
    if (ae !== be) return ae.localeCompare(be);
    return b.sessions_done - a.sessions_done;
  });
  return usable[0] ?? null;
}

export function attachReserved(packs: Omit<ClientPack, 'reserved' | 'remaining'>[], reservedBy: Map<string, number>): ClientPack[] {
  return packs.map(p => {
    const reserved = reservedBy.get(p.id) ?? 0;
    return { ...p, reserved, remaining: packRemaining({ ...p, reserved }) };
  });
}

export type PackDraft = {
  name: string;
  service_id: string | null;
  sessions_total: number;
  price_cents: number;
  valid_days: number | null;
};

export function draftFromTemplate(t: PackTemplate): PackDraft {
  return {
    name: t.name,
    service_id: t.service_id,
    sessions_total: t.sessions_total,
    price_cents: t.price_cents,
    valid_days: t.valid_days,
  };
}

/** Búsqueda en el selector de tratamientos/bonos. */
export function packMatchesSearch(p: { name: string; service_name?: string | null }, query: string) {
  const q = fold(query);
  if (!q) return true;
  if (/(^|\s)(bono|bonos|pack)(\s|$)/.test(q) || q === 'bono' || q === 'bonos') return true;
  return fold(p.name).includes(q) || fold(p.service_name ?? '').includes(q);
}

export function usableOpenPacksForClient(
  packs: ClientPack[],
  clientId: string,
  query = '',
): ClientPack[] {
  return packs.filter(
    p => packUsableBy(p, clientId) && packIsOpen(p) && packMatchesSearch(p, query),
  );
}

/** Bonos que van primero en una sección (categoría, último, más pedidos…). */
export function packsForSection(
  packs: ClientPack[],
  clientId: string,
  sectionServiceIds: string[],
  query = '',
): ClientPack[] {
  const ids = new Set(sectionServiceIds);
  const open = usableOpenPacksForClient(packs, clientId, query);
  return open
    .filter(p => p.service_id == null || ids.has(p.service_id))
    .sort((a, b) => {
      const ae = a.expires_at ?? '9999-12-31';
      const be = b.expires_at ?? '9999-12-31';
      if (ae !== be) return ae.localeCompare(be);
      return b.sessions_done - a.sessions_done;
    });
}
