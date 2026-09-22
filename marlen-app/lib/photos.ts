/** Destino de una foto de tratamiento. Sin DOM ni next/*. */

export type PhotoKind = 'before' | 'after';

export type PhotoTarget = {
  treatmentId: string;
  kind: PhotoKind;
  zone?: string | null;
  sessionNo?: number | null;
};

export function photoBusyKey(target: PhotoTarget) {
  return `${target.treatmentId}:${target.kind}:${target.zone ?? ''}:${target.sessionNo ?? 0}`;
}
