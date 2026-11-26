/** Destino de una foto de tratamiento. Sin DOM ni next/*. */

export type PhotoKind = 'before' | 'after';

export type PhotoTarget = {
  treatmentId?: string | null;
  clientId?: string | null;
  kind: PhotoKind;
  zone?: string | null;
  sessionNo?: number | null;
};

export function photoBusyKey(target: PhotoTarget) {
  const who = target.treatmentId || (target.clientId ? `c:${target.clientId}` : '');
  return `${who}:${target.kind}:${target.zone ?? ''}:${target.sessionNo ?? 0}`;
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
