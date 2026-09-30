/** Cuántos SheetShell en modo wide reclaman el panel derecho (LocalSheet sin URL). */
let claims = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** SheetShell wide: reclama el panel hasta que se cierre. */
export function claimDetailPanel(): () => void {
  claims += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims = Math.max(0, claims - 1);
    emit();
  };
}

export function subscribeDetailClaims(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

export function getDetailClaimCount() {
  return claims;
}
