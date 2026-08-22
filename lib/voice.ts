/** Comandos de voz / texto. Sin LLM: frases cortas en español de recepción. */

import { madridNow } from '@/lib/time';

export type VoiceCmd =
  | { kind: 'go'; href: string; say: string }
  | { kind: 'today' }
  | { kind: 'search'; q: string }
  | { kind: 'status'; status: 'curso' | 'noshow'; who: string }
  | { kind: 'book'; who: string; startMin: number | null; serviceQ: string | null; dayOffset: number; providerQ: string | null }
  | { kind: 'slots'; dayOffset: number; startMin: number | null; providerQ: string | null }
  | { kind: 'wait'; who: string | null }
  | { kind: 'help' }
  | { kind: 'unknown'; text: string };

const WEEKDAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

export function fold(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** 0 = hoy. «el miércoles» es el próximo (si hoy es sábado, el que viene). */
export function weekdayOffset(token: string): number | null {
  const t = fold(token);
  if (t === 'hoy') return 0;
  if (t === 'manana') return 1;
  if (t === 'pasado manana') return 2;
  const i = WEEKDAYS.indexOf(t as typeof WEEKDAYS[number]);
  if (i < 0) return null;
  const { y, m, d } = madridNow();
  const todayMon0 = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return (i - todayMon0 + 7) % 7;
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

const DAY_RE = /(?:el |este |proximo )?((?:pasado )?manana|hoy|lunes|martes|miercoles|jueves|viernes|sabado|domingo)/;
const TIME_RE = /(?:a las |a la |las )(\d{1,2})(?:[:h](\d{2})| y media| y (\d{2}))?/;

function takeProvider(s: string): { text: string; providerQ: string | null } {
  const con = s.match(/ con (?!las |la |el )([a-zñ]+)/);
  if (con) {
    return {
      text: `${s.slice(0, con.index)} ${s.slice((con.index ?? 0) + con[0].length)}`.replace(/\s+/g, ' ').trim(),
      providerQ: con[1],
    };
  }
  const puede = s.match(/(?:puede|tiene) ([a-zñ]+)/);
  if (puede) return { text: s, providerQ: puede[1] };
  return { text: s, providerQ: null };
}

function takeDay(s: string): { text: string; dayOffset: number } {
  const m = s.match(DAY_RE);
  if (!m) return { text: s, dayOffset: 0 };
  const off = weekdayOffset(m[1]);
  return {
    text: `${s.slice(0, m.index)} ${s.slice((m.index ?? 0) + m[0].length)}`.replace(/\s+/g, ' ').trim(),
    dayOffset: off ?? 0,
  };
}

function takeTime(s: string): { startMin: number | null; minutes: string; hour: string } | { startMin: null } {
  const m = s.match(TIME_RE);
  if (!m) return { startMin: null };
  let minutes = '00';
  if (m[0].includes('y media')) minutes = '30';
  else if (m[2]) minutes = m[2];
  else if (m[3]) minutes = m[3];
  return { startMin: parseClock(`${m[1]}:${minutes}`), minutes, hour: m[1] };
}

function parseSlots(t: string): VoiceCmd | null {
  if (!/(hueco|libre|disponib|cuando puede|a que hora)/.test(t)) return null;
  const p = takeProvider(t);
  const d = takeDay(p.text);
  const time = takeTime(d.text);
  return { kind: 'slots', dayOffset: d.dayOffset, startMin: time.startMin, providerQ: p.providerQ };
}

function parseBook(t: string): VoiceCmd | null {
  const p = takeProvider(t);
  let rest = p.text
    .replace(/^(crea(?:r)?(?:me)? |haz(?:me)? )/, '')
    .replace(/^(una )/, '')
    .replace(/^(nueva )?cita( nueva)? /, '')
    .replace(/^(apunta|anota|ponle|pon|agendar?) /, '')
    .replace(/^(para |a |de )/, '')
    .trim();
  if (!rest) return null;

  const time = rest.match(/ (?:a las |a la |las )(\d{1,2})(?:[:h](\d{2})| y media| y (\d{2}))?(?: (?:de |a )(.+))?$/);
  if (!time) return null;

  let minutes = '00';
  if (time[0].includes('y media')) minutes = '30';
  else if (time[2]) minutes = time[2];
  else if (time[3]) minutes = time[3];
  const startMin = parseClock(`${time[1]}:${minutes}`);
  const serviceQ = time[4] ? tidyWho(time[4]) : null;

  let head = rest.slice(0, time.index).trim();
  const d = takeDay(` ${head}`);
  const who = tidyWho(d.text);
  if (who.length < 2) return null;
  return { kind: 'book', who, startMin, serviceQ, dayOffset: d.dayOffset, providerQ: p.providerQ };
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

  const slots = parseSlots(t);
  if (slots) return slots;
  const booked = parseBook(t);
  if (booked) return booked;
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
  'crea una cita para Lucía Ferrer el miércoles a las 11:30 con Valeria',
  'quién tiene hueco el miércoles a las 11:30',
  'a qué hora puede Valeria mañana',
  'qué hay hoy',
].join(' · ');
