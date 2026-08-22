/** Comandos de voz / texto. Diccionario local: no hace falta un modelo. */

import { CATEGORIES, type CategoryId } from '@/lib/categories';
import { madridNow } from '@/lib/time';

export type VoiceCmd =
  | { kind: 'go'; href: string; say: string }
  | { kind: 'today' }
  | { kind: 'search'; q: string }
  | { kind: 'status'; status: 'curso' | 'noshow'; who: string }
  | { kind: 'book'; who: string; startMin: number | null; serviceQ: string | null; dayOffset: number; providerQ: string | null }
  | { kind: 'slots'; dayOffset: number; startMin: number | null; providerQ: string | null }
  | { kind: 'wait'; who: string | null }
  | { kind: 'cancel'; who: string; dayOffset: number }
  | { kind: 'move'; who: string; startMin: number; dayOffset: number; providerQ: string | null }
  | { kind: 'dismiss' }
  | { kind: 'help' }
  | { kind: 'unknown'; text: string };

const WEEKDAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

const HOUR_WORDS: Record<string, number> = {
  una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

const HOUR_TOKEN = `\\d{1,2}|${Object.keys(HOUR_WORDS).join('|')}`;
const DAY_RE = /(?:el |este |proximo |al |para (?:el )?|para )?((?:pasado )?manana|hoy|lunes|martes|miercoles|jueves|viernes|sabado|domingo)/;
const TIME_RE = new RegExp(
  `(?:a las |a la |las )(${HOUR_TOKEN})(?:[:.h](\\d{2})| y media| y cuarto| y (\\d{2}))?`,
);

export function fold(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** «Facial», «láser», «corporal» → categoría. No pisa un nombre de servicio. */
export function matchCategory(q: string): CategoryId | null {
  const t = fold(q);
  if (!t) return null;
  for (const id of Object.keys(CATEGORIES) as CategoryId[]) {
    if (t === id || t === fold(CATEGORIES[id].label)) return id;
  }
  for (const id of Object.keys(CATEGORIES) as CategoryId[]) {
    const label = fold(CATEGORIES[id].label);
    if (t.length >= 5 && (label.includes(t) || t.includes(label) || t.includes(id))) return id;
  }
  return null;
}

function hourOf(token: string): number | null {
  const t = fold(token);
  if (HOUR_WORDS[t] != null) return HOUR_WORDS[t];
  if (/^\d{1,2}$/.test(t)) return Number(t);
  return null;
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
  const t = fold(raw).replace('.', ':').replace('h', ':');
  const hm = t.match(new RegExp(`^(${HOUR_TOKEN})(?::(\\d{2}))?$`));
  if (!hm) return null;
  let h = hourOf(hm[1]);
  if (h === null) return null;
  const min = Number(hm[2] ?? 0);
  if (h < 9) h += 12;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function tidyWho(s: string) {
  return s
    .replace(/^(a|de|la|el|su|una|un)\s+/i, '')
    .replace(/\s+(para|de|a|el|la)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clockFromMatch(m: RegExpMatchArray): number | null {
  let minutes = '00';
  if (m[0].includes('y media')) minutes = '30';
  else if (m[0].includes('y cuarto')) minutes = '15';
  else if (m[2]) minutes = m[2];
  else if (m[3]) minutes = m[3];
  return parseClock(`${m[1]}:${minutes}`);
}

function takeProvider(s: string): { text: string; providerQ: string | null } {
  const con = s.match(/ con (?!las |la |el |hoy )([a-zñ]+)/);
  if (con) {
    return {
      text: `${s.slice(0, con.index)} ${s.slice((con.index ?? 0) + con[0].length)}`.replace(/\s+/g, ' ').trim(),
      providerQ: con[1],
    };
  }
  const de = s.match(/(?:huecos?|libre|libres|disponib\w*) de ([a-zñ]+)/);
  if (de) return { text: s, providerQ: de[1] };
  const puede = s.match(/(?:puede|tiene|atiende) (?!hueco|libre|cita)([a-zñ]+)/);
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

export function takeTime(s: string): { startMin: number | null } {
  const m = s.match(TIME_RE);
  if (!m) return { startMin: null };
  return { startMin: clockFromMatch(m) };
}

function stripTime(s: string) {
  return s.replace(TIME_RE, ' ').replace(/\s+/g, ' ').trim();
}

function parseSlots(t: string): VoiceCmd | null {
  if (!/(hueco|libre|disponib|cuando puede|a que hora|hay sitio|quien puede|quien esta libre)/.test(t)) {
    return null;
  }
  const p = takeProvider(t);
  const d = takeDay(p.text);
  const time = takeTime(d.text);
  return { kind: 'slots', dayOffset: d.dayOffset, startMin: time.startMin, providerQ: p.providerQ };
}

function parseBook(t: string): VoiceCmd | null {
  const saidBook = /(cita|reserv|apunt|anot|agend|ponle|hazme )/.test(t);
  if (!saidBook && takeTime(t).startMin === null) return null;
  if (/(hueco|libre|disponib|cuando puede|a que hora|hay sitio|quien puede)/.test(t)) return null;
  if (/(cancela|anula|mueve|cambia|reprograma|pasa(?:le)? (?:la )?cita)/.test(t)) return null;

  const p = takeProvider(t);
  const d = takeDay(p.text);
  const time = takeTime(d.text);
  let rest = stripTime(d.text)
    .replace(/^(crea(?:r)?(?:me)? |haz(?:me)? )/, '')
    .replace(/^(una )/, '')
    .replace(/^(nueva )?cita( nueva)?( para| de)? /, '')
    .replace(/^(reserva(?:r)?(?:me)? )(?:una cita )?(?:para |de )?/, '')
    .replace(/^(apunta|anota|ponle|pon|agendar?) (?:una cita )?(?:para |a |de )?/, '')
    .replace(/^(para |a |de )/, '')
    .replace(/\s+para$/i, '')
    .trim();

  const svc = rest.match(/ (?:de |a )(.+)$/);
  const serviceQ = svc ? tidyWho(svc[1]) : null;
  const who = tidyWho(svc ? rest.slice(0, svc.index) : rest);
  if (who.length < 2) return null;
  if (!saidBook && time.startMin === null) return null;
  return { kind: 'book', who, startMin: time.startMin, serviceQ, dayOffset: d.dayOffset, providerQ: p.providerQ };
}

function parseCancel(t: string): VoiceCmd | null {
  if (/^(cancelar?|anular?|nada|olvidalo|olvidar|cierra|cerrar|da igual|dejalo|fuera|no)$/.test(t)) {
    return { kind: 'dismiss' };
  }
  const m = t.match(/^(?:cancela(?:r)?|anula(?:r)?|quita|borra)(?: me)?(?: (?:la |su ))?(?:cita )?(?:de |a )?(.+)$/);
  if (!m) return null;
  const d = takeDay(m[1]);
  const who = tidyWho(d.text.replace(/^(la )?cita( de)? /, ''));
  if (who.length < 2) return { kind: 'dismiss' };
  return { kind: 'cancel', who, dayOffset: d.dayOffset };
}

function parseMove(t: string): VoiceCmd | null {
  if (!/(mueve|mover|cambia|cambiar|reprograma|pasa(?:le)? (?:la )?cita)/.test(t)) return null;
  const p = takeProvider(t);
  const stripped = p.text
    .replace(/^(?:mueve|mover|cambia|cambiar|reprograma)(?: me)? /, '')
    .replace(/^pasa(?:le)? (?:la )?cita /, '')
    .replace(/^(?:la )?cita /, '')
    .replace(/^(?:de |a )/, '')
    .trim();
  const d = takeDay(stripped);
  const time = takeTime(d.text);
  if (time.startMin === null) return null;
  const who = tidyWho(stripTime(d.text).replace(/ a las?$| las?$/, ''));
  if (who.length < 2) return null;
  return { kind: 'move', who, startMin: time.startMin, dayOffset: d.dayOffset, providerQ: p.providerQ };
}

export function parseVoice(text: string): VoiceCmd {
  const raw = text.replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const t = fold(raw);
  if (!t) return { kind: 'unknown', text: raw };

  if (/^(ayuda|que puedes|que se puede|comandos|que sabes|que haces)/.test(t)) return { kind: 'help' };

  const cancel = parseCancel(t);
  if (cancel) return cancel;

  if (
    t === 'hoy'
    || /^(que hay( hoy)?|citas( de hoy)?|resumen( de hoy)?|quien (falta|hay|viene)|en cabina|el dia|dame el dia|que toca( hoy)?|como va( el dia)?|que tal el dia|lista de hoy|agenda de hoy)$/.test(t)
    || t.includes('que hay hoy')
    || t.includes('citas de hoy')
    || t.includes('quien esta en cabina')
    || t.includes('quienes hay')
    || t.includes('quien falta hoy')
  ) {
    return { kind: 'today' };
  }

  const moved = parseMove(t);
  if (moved) return moved;

  let m = t.match(/^(?:marca )?(?:que )?(.+?) (?:no (?:ha |se ha )?venido|no vino|no se ha presentado|no aparece|ha faltado|falto)$/);
  if (m) return { kind: 'status', status: 'noshow', who: tidyWho(m[1]) };
  m = t.match(/^(?:no (?:ha |se ha )?venido|no vino|no se ha presentado|ha faltado|falta|no show|noshow)(?: (?:de|a))? (.+)$/);
  if (m) return { kind: 'status', status: 'noshow', who: tidyWho(m[1]) };

  m = t.match(/^pasa(?: a cabina)?(?: a| de)? (.+)$/);
  if (m) return { kind: 'status', status: 'curso', who: tidyWho(m[1]) };
  m = t.match(/^(?:entra|empieza|atiende|recibe)(?: a cabina)?(?: a)? (.+)$/);
  if (m) return { kind: 'status', status: 'curso', who: tidyWho(m[1]) };
  m = t.match(/^(.+) (?:a |en )cabina$/);
  if (m) return { kind: 'status', status: 'curso', who: tidyWho(m[1]) };
  m = t.match(/^(?:ha llegado|llego)(?: ya)? (.+)$/);
  if (m) return { kind: 'status', status: 'curso', who: tidyWho(m[1]) };

  if (t === 'espera' || t.includes('lista de espera') || t === 'quien espera' || t === 'la espera') {
    return { kind: 'wait', who: null };
  }
  m = t.match(/^(?:pon(?:le|la)?|mete|apunta|anade) (?:a )?(.+) en (?:la )?espera$/);
  if (m) return { kind: 'wait', who: tidyWho(m[1]) };
  m = t.match(/^espera(?: a)? (.+)$/);
  if (m) return { kind: 'wait', who: tidyWho(m[1]) };

  const slots = parseSlots(t);
  if (slots) return slots;
  const booked = parseBook(t);
  if (booked) return booked;
  if (/^(nueva cita|apuntar|anotar|agendar|reservar)$/.test(t)) {
    return { kind: 'go', href: '/agenda?new=1', say: 'Nueva cita' };
  }

  m = t.match(/^(?:busca(?:r)?|ficha(?: de)?|abre(?: la ficha de)?|datos de|clienta) (?:a )?(.+)$/);
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

function compact(s: string) {
  return fold(s).replace(/[^a-z0-9ñ]/g, '');
}

function glue(c: string) {
  return c
    .replace(/terapiay/g, 'terapia')
    .replace(/terapiamas/g, 'terapia')
    .replace(/terapiacon/g, 'terapia')
    .replace(/terapiaplus/g, 'terapia');
}

/** Cómo suele oír el dictado algunos tratamientos. */
const SERVICE_ALIASES: Record<string, string> = {
  vacum: 'vacumterapia',
  vacuum: 'vacumterapia',
  vacunterapia: 'vacumterapia',
  vacuumterapia: 'vacumterapia',
  vacunoterapia: 'vacumterapia',
  bakumterapia: 'vacumterapia',
  vacumterapia: 'vacumterapia',
  vacumterapiacavitacion: 'vacumterapiacavitacion',
  vacumterapiaycavitacion: 'vacumterapiacavitacion',
  vacumterapiamascavitacion: 'vacumterapiacavitacion',
  presioterapia: 'presoterapia',
  crioliposis: 'criolipolisis',
  criolipolisis: 'criolipolisis',
};

function serviceNeedle(raw: string) {
  const stripped = fold(raw)
    .replace(/^(pues |mira |vale |una |un |de |el |la |le hacemos |hacemos |quiero |ponle |para ella |para lucia )/, '')
    .trim();
  const c = glue(compact(stripped));
  return { folded: stripped, compact: SERVICE_ALIASES[c] ?? c };
}

export function scoreName(haystack: string, needle: string) {
  const h = fold(haystack);
  const n = serviceNeedle(needle);
  if (!n.folded && !n.compact) return 0;
  const hc = glue(compact(h));
  const nc = n.compact;
  if (!nc) return 0;
  if (hc === nc) return 100 + Math.min(hc.length, 30);
  if (nc.length >= 5 && hc.startsWith(nc)) return 70 + nc.length;
  if (nc.length >= 5 && hc.includes(nc)) return 55 + nc.length;
  if (hc.length >= 6 && nc.includes(hc)) return Math.round(35 * (hc.length / nc.length));
  if (h.startsWith(n.folded)) return 25;
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

export const VOICE_YES = /^(si|sip|vale|ok|okay|confirmo|hazlo|adelante|guardo|guardala|guardar|dale|perfecto|correcto)(\b.*)?$/;

export function isVoiceYes(text: string) {
  const t = fold(text);
  if (!t) return false;
  if (VOICE_YES.test(t)) return true;
  return /^(si|vale|ok)\b/.test(t) && /guard|confirma|hazlo|adelante|dale/.test(t);
}

function looksLikeMarlenne(word: string) {
  const t = fold(word).replace(/[^a-zñ]/g, '');
  if (t.length < 4 || t.length > 12) return false;
  if (/marlen|malen|merlen|marlan|marlin|marleni|marleny|malene|marlene/.test(t)) return true;
  return t.startsWith('marl') || (t.startsWith('mal') && t.includes('n'));
}

/** «Hola Marlenne» / «oye Marlene»… y el resto del comando, si vino en el mismo aliento. */
export function splitWake(text: string): { woke: boolean; rest: string } {
  const t = fold(text.replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' '));
  if (!t) return { woke: false, rest: '' };
  const words = t.split(/\s+/);
  const nameAt = words.findIndex(looksLikeMarlenne);
  if (nameAt >= 0) {
    return { woke: true, rest: words.slice(nameAt + 1).join(' ').trim() };
  }
  if (words.length === 1 && /^(hola|ola|oye|buenas)$/.test(words[0])) {
    return { woke: true, rest: '' };
  }
  return { woke: false, rest: text.trim() };
}

export const VOICE_HELP = [
  'cita para Lucía el miércoles a las once y media con Valeria',
  'quién tiene hueco mañana a las 11:30',
  'a qué hora puede Valeria',
  'qué hay hoy',
  'cancela la cita de Lucía',
  'mueve a Lucía a las 12',
].join(' · ');
