/** Destino de una foto de tratamiento. Sin DOM ni next/*. */

export type PhotoKind = 'before' | 'after';

export type PhotoTarget = {
  treatmentId?: string | null;
  serviceId?: string | null;
  clientId?: string | null;
  kind: PhotoKind;
  zone?: string | null;
  sessionNo?: number | null;
};

export type PhotoChoiceSection = 'open' | 'closed' | 'service';

export type PhotoChoice = {
  key: string;
  label: string;
  section: PhotoChoiceSection;
  treatmentId?: string;
  serviceId?: string;
  zone?: string | null;
  sessionNo?: number | null;
};

export function photoBusyKey(target: PhotoTarget) {
  const who =
    target.treatmentId
    || (target.serviceId ? `s:${target.serviceId}` : null)
    || (target.clientId ? `c:${target.clientId}` : '');
  return `${who}:${target.kind}:${target.zone ?? ''}:${target.sessionNo ?? 0}`;
}

/** Tratamientos ya abiertos y, si no hay cita de ese servicio, el propio servicio. */
export function photoChoices(
  treatments: {
    id: string;
    serviceId?: string | null;
    name: string;
    zone?: string | null;
    closed?: boolean;
    sessionsDone?: number | null;
  }[],
  services: { id: string; name: string; category?: string | null }[],
): PhotoChoice[] {
  const open = treatments.filter(t => !t.closed);
  const closed = treatments.filter(t => t.closed);
  const taken = new Set(treatments.map(t => t.serviceId).filter((id): id is string => !!id));
  const rows: PhotoChoice[] = [];
  for (const t of open) {
    rows.push({
      key: `t:${t.id}`,
      label: t.zone ? `${t.name} · ${t.zone}` : t.name,
      section: 'open',
      treatmentId: t.id,
      zone: t.zone ?? null,
      sessionNo: t.sessionsDone || undefined,
    });
  }
  for (const t of closed) {
    rows.push({
      key: `t:${t.id}`,
      label: t.zone ? `${t.name} · ${t.zone}` : t.name,
      section: 'closed',
      treatmentId: t.id,
      zone: t.zone ?? null,
      sessionNo: t.sessionsDone || undefined,
    });
  }
  for (const s of services) {
    if (s.category === 'valoracion' || taken.has(s.id)) continue;
    rows.push({
      key: `s:${s.id}`,
      label: s.name,
      section: 'service',
      serviceId: s.id,
    });
  }
  rows.push({
    key: 'client',
    label: 'Ficha (sin vincular a un tratamiento)',
    section: 'service',
  });
  return rows;
}

export type PhotoCircleItem = {
  id: string;
  kind: PhotoKind;
  zone: string | null;
  session_no: number | null;
  storage_path: string;
  taken_at: string;
};

export type PhotoSessionGroup = {
  key: string;
  session: number | null;
  zone: string | null;
  takenAt: string;
  photos: PhotoCircleItem[];
};

export type PhotoAlbum = {
  key: string;
  treatmentId: string;
  title: string;
  latestAt: string;
  sessions: PhotoSessionGroup[];
};

/** Un bloque por tratamiento. Dentro, las sesiones; en cada una, las fotos en cuadrado. */
export function groupPhotosByTreatment(
  treatments: { id: string; title: string; photos: PhotoCircleItem[] }[],
  clientPhotos: PhotoCircleItem[] = [],
): PhotoAlbum[] {
  const albums: PhotoAlbum[] = [];

  const push = (key: string, treatmentId: string, title: string, photos: PhotoCircleItem[]) => {
    if (!photos.length) return;
    const sessions = new Map<string, PhotoSessionGroup>();
    for (const photo of photos) {
      const sessionKey = `${photo.session_no ?? 0}|${photo.zone ?? ''}`;
      const group = sessions.get(sessionKey) ?? {
        key: `${key}|${sessionKey}`,
        session: photo.session_no,
        zone: photo.zone,
        takenAt: photo.taken_at,
        photos: [],
      };
      group.photos.push(photo);
      if (+new Date(photo.taken_at) > +new Date(group.takenAt)) group.takenAt = photo.taken_at;
      sessions.set(sessionKey, group);
    }
    const list = [...sessions.values()].map(session => ({
      ...session,
      photos: [...session.photos].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'before' ? -1 : 1;
        return +new Date(a.taken_at) - +new Date(b.taken_at);
      }),
    })).sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt));
    albums.push({
      key,
      treatmentId,
      title,
      latestAt: list[0]?.takenAt ?? photos[0].taken_at,
      sessions: list,
    });
  };

  for (const treatment of treatments) push(treatment.id, treatment.id, treatment.title, treatment.photos);
  push('client', '', 'Sin tratamiento', clientPhotos);
  return albums.sort((a, b) => +new Date(b.latestAt) - +new Date(a.latestAt));
}

/** Carpeta del bucket: el tratamiento, o `client/<id>` si la foto es de la ficha. */
export function photoObjectPath(target: PhotoTarget, stamp: number) {
  const folder = target.treatmentId
    ? target.treatmentId
    : target.clientId
      ? `client/${target.clientId}`
      : '';
  if (!folder) return '';
  return `${folder}/${target.kind}-${stamp}.jpg`;
}
