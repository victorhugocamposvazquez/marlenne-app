'use client';

import { useEffect, useState } from 'react';

type NetInfo = { saveData?: boolean; effectiveType?: string };

export function isSlowNetwork() {
  if (typeof navigator === 'undefined') return false;
  const c = (navigator as Navigator & { connection?: NetInfo }).connection;
  if (!c) return false;
  if (c.saveData) return true;
  return c.effectiveType === 'slow-2g' || c.effectiveType === '2g';
}

/** En 2g o ahorro de datos no se piden el resto de pestañas a la vez. */
export function usePrefetchOk() {
  const [ok, setOk] = useState(true);
  useEffect(() => { setOk(!isSlowNetwork()); }, []);
  return ok;
}
