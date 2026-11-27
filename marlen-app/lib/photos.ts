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
