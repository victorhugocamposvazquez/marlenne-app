/** Server Actions que hacen redirect() lanzan esto; hay que re-lanzarlo en el cliente. */
export function isNextRedirect(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('digest' in err)) return false;
  return String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT');
}
