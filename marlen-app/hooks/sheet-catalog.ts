'use client';

import { loadClientPickerInitial } from '@/app/actions/client-list';
import {
  loadPackTemplates, loadSalonPacks, loadServiceCounts, loadServices,
} from '@/lib/agenda-catalog';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientOption, ClientPack, PackTemplate, ServiceOption } from '@/lib/types';

const KEY = 'marlen.sheetCatalog.v1';
const FRESH_MS = 60_000;

export type SheetCatalog = {
  services: ServiceOption[];
  packs: ClientPack[];
  templates: PackTemplate[];
  counts: Record<string, number>;
  clients: ClientOption[];
  at: number;
};

const empty = (): SheetCatalog => ({
  services: [],
  packs: [],
  templates: [],
  counts: {},
  clients: [],
  at: 0,
});

export function readSheetCatalog(): SheetCatalog | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SheetCatalog;
    if (!Array.isArray(data?.services)) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSheetCatalog() {
  try { sessionStorage.removeItem(KEY); } catch { /* privado */ }
}

const listeners = new Set<(data: SheetCatalog) => void>();

function publish(data: SheetCatalog) {
  try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* cuota */ }
  for (const fn of listeners) fn(data);
}

export function subscribeSheetCatalog(fn: (data: SheetCatalog) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

let lightFlight: Promise<SheetCatalog> | null = null;
let fullFlight: Promise<void> | null = null;
let lightAt = 0;
let fullAt = 0;
let gen = 0;

async function loadLight(sb: SupabaseClient, mine: number): Promise<SheetCatalog> {
  const prev = readSheetCatalog() ?? empty();
  const [services, clients] = await Promise.all([
    loadServices(sb),
    loadClientPickerInitial(),
  ]);
  const fast: SheetCatalog = { ...prev, services, clients, at: Date.now() };
  if (mine !== gen) return readSheetCatalog() ?? fast;
  publish(fast);
  lightAt = fast.at;
  return fast;
}

function loadFull(sb: SupabaseClient, mine: number, base: SheetCatalog) {
  if (fullFlight) return fullFlight;
  fullFlight = Promise.all([
    loadSalonPacks(sb),
    loadPackTemplates(sb),
    loadServiceCounts(sb),
  ]).then(([packs, templates, counts]) => {
    if (mine !== gen) return;
    const full: SheetCatalog = { ...base, packs, templates, counts, at: Date.now() };
    publish(full);
    fullAt = full.at;
  }).catch(() => undefined).finally(() => { fullFlight = null; });
  return fullFlight;
}

/**
 * Servicios y primeras clientas. Con `full`, también bonos y conteos,
 * pero solo cuando se abre una cita (no en cada pantalla).
 */
export function warmSheetCatalog(
  sb: SupabaseClient,
  opts?: { full?: boolean },
): Promise<SheetCatalog> {
  const wantFull = opts?.full === true;
  const cached = readSheetCatalog();
  const lightFresh = !!cached?.services.length && Date.now() - lightAt < FRESH_MS;
  const fullFresh = Date.now() - fullAt < FRESH_MS && fullAt > 0;
  if (lightFresh && (!wantFull || fullFresh)) return Promise.resolve(cached as SheetCatalog);

  const mine = gen;
  const light = lightFresh && cached
    ? Promise.resolve(cached)
    : (lightFlight ?? (lightFlight = loadLight(sb, mine).finally(() => { lightFlight = null; })));

  if (!wantFull) return light;
  return light.then(base => loadFull(sb, mine, base).then(() => readSheetCatalog() ?? base));
}

export function clearPrivateCaches() {
  gen += 1;
  lightAt = 0;
  fullAt = 0;
  clearSheetCatalog();
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_PAGES' });
  } catch { /* sin worker */ }
}
