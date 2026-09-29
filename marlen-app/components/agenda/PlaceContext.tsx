'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type PlacePick = { providerId: string; startMin: number };

export type PlaceSession = {
  durationMin: number | null;
  starts: Record<string, number[]>;
  pick: PlacePick | null;
  clientLabel: string;
  serviceName: string;
  onPick: (p: PlacePick) => void;
  /** Cita en edición: no bloquea su propio hueco. */
  excludeId?: string | null;
};

type PlaceCtx = {
  placing: boolean;
  durationMin: number | null;
  starts: Record<string, number[]>;
  pick: PlacePick | null;
  clientLabel: string;
  serviceName: string;
  onPick: (p: PlacePick) => void;
  excludeId: string | null;
  publish: (s: PlaceSession | null) => void;
};

const Ctx = createContext<PlaceCtx | null>(null);

const noop = () => {};

const idle: PlaceCtx = {
  placing: false,
  durationMin: null,
  starts: {},
  pick: null,
  clientLabel: '',
  serviceName: '',
  onPick: noop,
  excludeId: null,
  publish: noop,
};

export function PlaceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlaceSession | null>(null);
  const publish = useCallback((s: PlaceSession | null) => setSession(s), []);
  const value = useMemo<PlaceCtx>(() => ({
    placing: !!session,
    durationMin: session?.durationMin ?? null,
    starts: session?.starts ?? {},
    pick: session?.pick ?? null,
    clientLabel: session?.clientLabel ?? '',
    serviceName: session?.serviceName ?? '',
    onPick: session?.onPick ?? noop,
    excludeId: session?.excludeId ?? null,
    publish,
  }), [session, publish]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlace() {
  return useContext(Ctx) ?? idle;
}
