/** Comandos de voz / texto. Sin LLM: frases cortas en español de recepción. */

export type VoiceCmd =
  | { kind: 'go'; href: string; say: string }
  | { kind: 'today' }
  | { kind: 'search'; q: string }
  | { kind: 'status'; status: 'curso' | 'noshow'; who: string }
  | { kind: 'book'; who: string; startMin: number | null; serviceQ: string | null }
  | { kind: 'wait'; who: string | null }
  | { kind: 'help' }
  | { kind: 'unknown'; text: string };

export function fold(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function parseClock(raw: string): number | null {
  const t = fold(raw).replace('.', ':');
  const hm = t.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!hm) return null;
  let h = Number(hm[1]);
  const m = Number(hm[2] ?? 0);
  if (h < 9) h += 12;
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

function tidyWho(s: string) {
  return s.replace(/^(a|de|la|el)\s+/i, '').replace(/\s+/g, ' ').trim();
}

export function parseVoice(text: string): VoiceCmd {
  const raw = text.replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const t = fold(raw);
  if (!t) return { kind: 'unknown', text: raw };

  if (/^(ayuda|que puedes|que se puede|comandos)/.test(t)) return { kind: 'help' };

  if (
    t === 'hoy'
    || /^(que hay( hoy)?|citas( de hoy)?|resumen( de hoy)?|quien (falta|hay)|en cabina)$/.test(t)
    || t.includes('que hay hoy')
    || t.includes('citas de hoy')
  ) {
    return { kind: 'today' };
  }

  let m = t.match(/^(?:marca )?(?:que )?(.+?) (?:no (?:ha )?venido|no vino|ha faltado|falto)$/);
  if (m) return { kind: 'status', status: 'noshow', who: tidyWho(m[1]) };
  m = t.match(/^(?:no (?:ha )?venido|no vino|ha faltado)(?: (?:de|a))? (.+)$/);
  if (m) return { kind: 'status', status: 'noshow', who: tidyWho(m[1]) };

  m = t.match(/^pasa(?: a cabina)?(?: a| de)? (.+)$/);
  if (m) return { kind: 'status', status: 'curso', who: tidyWho(m[1]) };
  m = t.match(/^entra(?: a cabina)?(?: a)? (.+)$/);
  if (m) return { kind: 'status', status: 'curso', who: tidyWho(m[1]) };
  m = t.match(/^(.+) (?:a |en )cabina$/);
  if (m) return { kind: 'status', status: 'curso', who: tidyWho(m[1]) };

  if (t === 'espera' || t.includes('lista de espera') || t === 'quien espera') {
    return { kind: 'wait', who: null };
  }
  m = t.match(/^(?:pon(?:le|la)?|mete) (?:a )?(.+) en (?:la )?espera$/);
  if (m) return { kind: 'wait', who: tidyWho(m[1]) };
  m = t.match(/^espera(?: a)? (.+)$/);
  if (m) return { kind: 'wait', who: tidyWho(m[1]) };

  m = t.match(
    /^(?:cita|apunta|anota|ponle|pon|agendar?) (?:para |a |de )?(.+?) (?:a las |a la |las )(\d{1,2}) y media(?: (?:de |a )?(.+))?$/,
  );
  if (m) {
    const start = parseClock(`${m[2]}:30`);
    return { kind: 'book', who: tidyWho(m[1]), startMin: start, serviceQ: m[3] ? tidyWho(m[3]) : null };
  }
  m = t.match(
    /^(?:cita|apunta|anota|ponle|pon|agendar?) (?:para |a |de )?(.+?) (?:a las |a la |las )(\d{1,2})(?:[:h](\d{2}))?(?: (?:de |a )?(.+))?$/,
  );
  if (m) {
    const start = parseClock(m[3] ? `${m[2]}:${m[3]}` : m[2]);
    return { kind: 'book', who: tidyWho(m[1]), startMin: start, serviceQ: m[4] ? tidyWho(m[4]) : null };
  }
  if (/^(nueva cita|apuntar|anotar|agendar)$/.test(t)) {
    return { kind: 'go', href: '/agenda?new=1', say: 'Nueva cita' };
  }

  m = t.match(/^(?:busca(?:r)?|ficha(?: de)?) (?:a )?(.+)$/);
  if (m) return { kind: 'search', q: tidyWho(m[1]) };
  if (t === 'clientas' || t === 'fichas') {
    return { kind: 'go', href: '/clientas', say: 'Clientas' };
  }

  if (/^(agenda|calendario)$/.test(t)) {
    return { kind: 'go', href: '/agenda', say: 'Agenda' };
  }
  if (/^(ajustes|configuracion|mas)$/.test(t)) {
    return { kind: 'go', href: '/ajustes', say: 'Más' };
  }

  return { kind: 'unknown', text: raw };
}

export function scoreName(haystack: string, needle: string) {
  const h = fold(haystack);
  const n = fold(needle);
  if (!n) return 0;
  if (h === n) return 4;
  if (h.startsWith(n)) return 3;
  if (h.split(' ').some(w => w.startsWith(n))) return 2;
  if (h.includes(n)) return 1;
  return 0;
}

export function bestNameMatches<T>(rows: T[], needle: string, label: (row: T) => string): T[] {
  const ranked = rows
    .map(row => ({ row, score: scoreName(label(row), needle) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return [];
  const top = ranked[0].score;
  return ranked.filter(x => x.score === top).map(x => x.row);
}

export const VOICE_HELP = [
  'qué hay hoy',
  'pasa Lucía',
  'Lucía no ha venido',
  'cita Lucía a las 11 de láser',
  'busca Alba',
  'pon Nerea en espera',
  'nueva cita',
].join(' · ');
