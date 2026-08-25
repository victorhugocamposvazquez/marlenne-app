'use client';

import { useEffect, useState } from 'react';

const EVT = 'marlenne-qs';

/** Cambia la query sin roundtrip al Server Component (router.push recargaría la agenda). */
export function shallowSet(patch: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(patch)) {
    if (!v) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const prev = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === prev) return;
  window.history.pushState(null, '', next);
  window.dispatchEvent(new Event(EVT));
}

export function useShallowParam(key: string, initial?: string | null) {
  const [value, setValue] = useState<string | null>(initial ?? null);
  useEffect(() => {
    const read = () => setValue(new URLSearchParams(window.location.search).get(key));
    read();
    window.addEventListener('popstate', read);
    window.addEventListener(EVT, read);
    return () => {
      window.removeEventListener('popstate', read);
      window.removeEventListener(EVT, read);
    };
  }, [key]);
  return value;
}
