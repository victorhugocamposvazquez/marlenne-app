const KEY = 'marlenne-last-service';

export function readLastServiceId(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function writeLastServiceId(id: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, id); } catch { /* */ }
}
