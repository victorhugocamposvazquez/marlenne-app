/**
 * Clientas por voz: «Lucía», «Lucía Pérez», «Lucía P», con errores de dictado.
 * Personas, no servicios: aquí no entran los alias de tratamientos.
 */

import { editDist, fold } from '@/lib/voice';

export type ClientLike = { full_name: string };

/** Chip de pantalla/voz cuando no está en fichas. Vive aquí, no en actions: Next no deja exportar constantes de «use server». */
export const NEW_CLIENT_CHIP = 'Es nueva';

export type ClientResolution<T> =
  | { kind: 'one'; client: T }
  /** Varias con el mismo nombre: hay que preguntar cuál. */
  | { kind: 'several'; options: T[] }
  /** Ninguna igual, pero parecidas: puede ser dictado sucio o una nueva. */
  | { kind: 'similar'; options: T[] }
  | { kind: 'none' };

const FILLER = /\b(a|de|la|el|para|con|cita|una|un|eh+|pues|mira|senora|sra|dona|don|senorita|srta|clienta|es|nueva)\b/g;
const SKIP_TOKEN = /^(vale|ok|okay|ya|eh+)$/;

/** Cómo se dice el nombre en mostrador. */
const NICKS: Record<string, string> = {
  vale: 'valeria',
  val: 'valeria',
  mari: 'maria',
  nuri: 'nuria',
  patri: 'patricia',
  cris: 'cristina',
  kris: 'cristina',
  loli: 'dolores',
  conchi: 'concepcion',
  merche: 'mercedes',
  lupe: 'guadalupe',
  tere: 'teresa',
};

function tokens(s: string) {
  return fold(s)
    .replace(/[¿?¡!.,;:«»"'()-]/g, ' ')
    .replace(FILLER, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Cuánto se parece un token dicho a uno del nombre: 3 exacto, 2 inicial/prefijo, 1 con error de dictado, 0 nada. */
function tokenScore(said: string, name: string) {
  const nick = NICKS[said];
  if (said === name || (nick && nick === name)) return 3;
  if (said.length === 1 && name.startsWith(said)) return 2;
  if (said.length >= 3 && name.startsWith(said)) return 2;
  if (nick && nick.length >= 3 && name.startsWith(nick)) return 2;
  if (said.length >= 4 && name.length >= 4) {
    const d = editDist(said, name);
    const max = said.length >= 7 ? 2 : 1;
    if (d <= max) return 1;
  }
  return 0;
}

/**
 * 0 = nada. ≥ 80 = la ha nombrado (todo lo dicho encaja). 50–79 = parecida.
 * El primer nombre pesa más que los apellidos.
 */
export function scoreClient(fullName: string, said: string) {
  const q = tokens(said);
  const n = tokens(fullName);
  if (!q.length || !n.length) return 0;
  if (q.join(' ') === n.join(' ')) return 100;

  const used = new Set<number>();
  let exactAll = true;
  let firstHit = false;
  let fuzzy = 0;
  for (const t of q) {
    let best = 0;
    let at = -1;
    n.forEach((w, i) => {
      if (used.has(i)) return;
      const s = tokenScore(t, w);
      if (s > best) { best = s; at = i; }
    });
    if (best === 0) {
      if (SKIP_TOKEN.test(t)) continue;
      return 0;
    }
    used.add(at);
    if (at === 0) firstHit = true;
    if (best < 3) exactAll = false;
    if (best === 1) fuzzy += 1;
  }
  if (!used.size) return 0;
  if (fuzzy) return 50 + (firstHit ? 6 : 0) + (q.length > 1 ? 4 : 0) - fuzzy * 2;
  let score = 80 + (firstHit ? 8 : 0) + Math.min(q.length, 3) * 4;
  if (!exactAll) score -= 6;
  return score;
}

/**
 * Qué clienta es. `within` son las opciones que se acaban de ofrecer:
 * ahí basta el apellido o «la primera» (eso lo resuelve quien llama).
 */
export function resolveClient<T extends ClientLike>(
  clients: T[],
  said: string,
  within: T[] | null = null,
): ClientResolution<T> {
  const pool = within?.length ? within : clients;
  const ranked = pool
    .map(c => ({ c, score: scoreClient(c.full_name, said) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) {
    if (within?.length) return resolveClient(clients, said, null);
    return { kind: 'none' };
  }
  const top = ranked[0].score;
  if (top >= 80) {
    const named = ranked.filter(x => x.score >= 80 && x.score >= top - 4);
    if (named.length === 1) return { kind: 'one', client: named[0].c };
    return { kind: 'several', options: named.map(x => x.c).slice(0, 5) };
  }
  return { kind: 'similar', options: ranked.slice(0, 4).map(x => x.c) };
}

/**
 * Equipo: mismos apodos que las clientas, y «la de láser» si el puesto encaja.
 */
export function resolveProvider<T extends ClientLike & { job_title?: string | null }>(
  team: T[],
  said: string,
): ClientResolution<T> {
  const q = tokens(said);
  const named = resolveClient(team, said);
  if (named.kind === 'one' || named.kind === 'several') return named;
  if (!q.length) return named;
  const byJob = team.filter(p => {
    const job = tokens(p.job_title ?? '');
    if (!job.length) return false;
    return q.every(t => job.some(j => j === t || j.includes(t) || t.includes(j) || tokenScore(t, j) >= 2));
  });
  if (byJob.length === 1) return { kind: 'one', client: byJob[0] };
  if (byJob.length > 1) return { kind: 'several', options: byJob.slice(0, 5) };
  return named;
}

/**
 * Citas (u otras filas) de una clienta dicha por voz, con la misma tolerancia.
 * Devuelve las que la nombran; si ninguna, las parecidas; si nada, [].
 */
export function rowsByClient<T>(rows: T[], said: string, label: (row: T) => string): T[] {
  const wrapped = rows.map(row => ({ full_name: label(row), row }));
  const r = resolveClient(wrapped, said);
  if (r.kind === 'one') return [r.client.row];
  if (r.kind === 'several' || r.kind === 'similar') return r.options.map(o => o.row);
  return [];
}

/** Nombre corto para la pantalla/oído: «Lucía Pérez» → «Lucía P.» si hay otra Lucía. */
export function shortNames<T extends ClientLike>(rows: T[]) {
  const first = (s: string) => fold(s).split(/\s+/)[0];
  return rows.map(r => {
    const parts = r.full_name.trim().split(/\s+/);
    const dup = rows.some(o => o !== r && first(o.full_name) === first(r.full_name));
    if (!dup || parts.length === 1) return parts[0];
    return `${parts[0]} ${parts.slice(1).join(' ')}`;
  });
}
