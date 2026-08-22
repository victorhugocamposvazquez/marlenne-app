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

const CLOCK_SPOKE = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once'] as const;

/** 690 → «once y media». Para decir la hora, no para pantallas. */
export function spokenClock(min: number) {
  const h12 = Math.floor(min / 60) % 12 || 12;
  const m = min % 60;
  const hour = CLOCK_SPOKE[h12 % 12];
  if (m === 0) return hour;
  if (m === 15) return `${hour} y cuarto`;
  if (m === 30) return `${hour} y media`;
  if (m === 45) return `${CLOCK_SPOKE[(h12 % 12 + 1) % 12]} menos cuarto`;
  return `${hour} ${m}`;
}

/** Lo que se oye: horas dichas, comas en vez de ·, sin «di sí o no». */
export function forEar(text: string) {
  return text
    .replace(/[·•]/g, ',')
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => spokenClock(Number(h) * 60 + Number(m)))
    .replace(/\ba las una\b/gi, 'a la una')
    .replace(/\s*[.!]?\s*Di sí o no\.?/gi, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

/** «Facial», «láser», «corporal» → categoría. No pisa un nombre de servicio. */
export function matchCategory(q: string): CategoryId | null {
  const t = fold(q);
  if (!t) return null;
  for (const id of Object.keys(CATEGORIES) as CategoryId[]) {
    if (t === id || t === fold(CATEGORIES[id].label)) return id;
  }
  if (/depilaci|laser|l[aá]ser/.test(t)) return 'laser';
  if (/microblad|micropig/.test(t)) return 'micro';
  if (/masaje|bienestar/.test(t)) return 'bienestar';
  if (/valoraci|asesor/.test(t)) return 'valoracion';
  if (/^facial$|lifting|peeling|hifu|bloom|purifying|resurfacing/.test(t)) return 'facial';
  if (/corporal|terapia|cavit|vacum|vacuum|preso|radiofrec|criolip|lipolaser|onnafit|core ?fit/.test(t)) {
    return 'corporal';
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
  if (m[0].includes('menos cuarto')) {
    const h = hourOf(m[1]);
    if (h === null) return null;
    const prev = h === 1 ? 12 : h - 1;
    return parseClock(`${prev}:45`);
  }
  let minutes = '00';
  if (m[0].includes('y media')) minutes = '30';
  else if (m[0].includes('y cuarto')) minutes = '15';
  else if (m[2]) minutes = m[2];
  else if (m[3]) minutes = m[3];
  return parseClock(`${m[1]}:${minutes}`);
}

const SERVICE_WORD = /terapia|cavit|vacum|vacuum|preso|radiofrec|laser|masaje|hifu|facial|criolip|microblad|onnafit|lipolaser|purifying|bloom|radiance/;

function takeProvider(s: string): { text: string; providerQ: string | null } {
  const con = s.match(/ con (?!las |la |el |hoy )([a-zñ]+)/);
  if (con && !SERVICE_WORD.test(con[1])) {
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

const BARE_TIME = new RegExp(
  `^(?:a )?(?:las |la )?(${HOUR_TOKEN})(?:[:.h](\\d{2})| y media| y cuarto| y (\\d{2})| menos cuarto)?$`,
);

/** «a las 11:30», «once y media», «las cinco». */
export function takeTime(s: string): { startMin: number | null } {
  const t = fold(s).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const m = t.match(TIME_RE);
  if (m) return { startMin: clockFromMatch(m) };
  const hm = t.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (hm) {
    const clock = parseClock(`${hm[1]}:${hm[2]}`);
    if (clock != null) return { startMin: clock };
  }
  const bare = t.match(BARE_TIME);
  if (bare) return { startMin: clockFromMatch(bare) };
  return { startMin: null };
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

function looksLikeService(s: string) {
  const c = serviceNeedle(s).compact;
  if (!c || c.length < 4) return false;
  if (SERVICE_ALIASES[c]) return true;
  if (SERVICE_WORD.test(c)) return true;
  return false;
}

function takeServiceTail(rest: string): { who: string; serviceQ: string | null } {
  const de = rest.match(/ (?:de |a )(.+)$/);
  if (de) return { who: tidyWho(rest.slice(0, de.index)), serviceQ: tidyWho(de[1]) };
  const words = rest.split(/\s+/).filter(Boolean);
  for (let i = 1; i < words.length; i++) {
    const tail = words.slice(i).join(' ');
    if (looksLikeService(tail)) {
      return { who: tidyWho(words.slice(0, i).join(' ')), serviceQ: tail };
    }
  }
  return { who: tidyWho(rest), serviceQ: null };
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

  const split = takeServiceTail(rest);
  if (split.who.length < 2) return null;
  if (!saidBook && time.startMin === null) return null;
  return {
    kind: 'book',
    who: split.who,
    startMin: time.startMin,
    serviceQ: split.serviceQ,
    dayOffset: d.dayOffset,
    providerQ: p.providerQ,
  };
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
  bacumterapia: 'vacumterapia',
  facumterapia: 'vacumterapia',
  vacumterapia: 'vacumterapia',
  vaconterapia: 'vacumterapia',
  conterapia: 'vacumterapia',
  conterpia: 'vacumterapia',
  conterpi: 'vacumterapia',
  conterapi: 'vacumterapia',
  vacumterapiacavitacion: 'vacumterapiacavitacion',
  vacumterapiaycavitacion: 'vacumterapiacavitacion',
  vacumterapiamascavitacion: 'vacumterapiacavitacion',
  presioterapia: 'presoterapia',
  presoterapia: 'presoterapia',
  crioliposis: 'criolipolisis',
  criolipolisis: 'criolipolisis',
  cabitacion: 'cavitacion',
  gravitacion: 'cavitacion',
  cavitacion: 'cavitacion',
};

function normalizeServiceHeard(raw: string) {
  return fold(raw)
    .replace(/[«»"'¿?¡!]/g, ' ')
    .replace(/^(pues |mira |vale |una |un |de |el |la |le hacemos |hacemos |quiero |ponle |para ella )/, '')
    .replace(/\bva con\b/g, 'vacum')
    .replace(/\b(una |el |la )?con terapia\b/g, 'vacumterapia')
    .replace(/\bconterapia\b/g, 'vacumterapia')
    .replace(/\bconterpia\b/g, 'vacumterapia')
    .replace(/\s+/g, ' ')
    .trim();
}

function terapiaAlias(c: string) {
  if (c === 'terapia') return null;
  if (!c.includes('terapia')) return null;
  const stem = c.replace(/terapia.*$/, '');
  if (/^(va)?con$/.test(stem) || /vacu|baku|facu|vacun|bakum|vacum|bacum/.test(stem)) {
    return c.includes('cavit') ? 'vacumterapiacavitacion' : 'vacumterapia';
  }
  if (/preso|presio/.test(stem)) return 'presoterapia';
  return null;
}

function serviceNeedle(raw: string) {
  const stripped = normalizeServiceHeard(raw);
  const c = glue(compact(stripped));
  return { folded: stripped, compact: SERVICE_ALIASES[c] ?? terapiaAlias(c) ?? c };
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

function editDist(a: string, b: string) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/** Servicios: aliases + «conterapia» / oídos típicos. No usar para nombres de personas. */
export function scoreService(haystack: string, needle: string) {
  let exact = scoreName(haystack, needle);
  const nf = fold(needle);
  const hf = fold(haystack);
  if (/cavit/.test(nf) && /cavit/.test(hf)) exact += 22;
  if (/(1 hora|una hora)/.test(nf) && /1 hora/.test(hf)) exact += 22;
  if (exact >= 55) return exact;
  const hc = glue(compact(haystack));
  const nc = serviceNeedle(needle).compact;
  if (nc.length >= 6 && hc.length >= 6) {
    const d = editDist(hc, nc);
    if (d <= 2 || d / Math.max(hc.length, nc.length) <= 0.22) {
      return 48 + Math.max(0, 12 - d * 3);
    }
  }
  return exact;
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

/** «Vacumterapia», «Vacumterapia - 1 hora», «Vacumterapia + cavitación». */
export function serviceFamily<T>(pickedName: string, rows: T[], label: (row: T) => string): T[] {
  const base = fold(pickedName).replace(/\s*[-+–].*$/, '').trim();
  if (base.length < 4) return [];
  const hits = rows.filter(row => {
    const n = fold(label(row));
    return n === base || n.startsWith(`${base} `) || n.startsWith(`${base}-`) || n.startsWith(`${base}+`);
  });
  return hits.length > 1 ? hits : [];
}

export function saidServiceVariant(q: string) {
  const t = fold(q);
  return /cavit|1 hora|una hora|media hora|treinta|sesenta|\b60\b|\b45\b|\b30\b|corta|larga/.test(t);
}

export function bestServiceMatches<T>(rows: T[], needle: string, label: (row: T) => string): T[] {
  const ranked = rows
    .map(row => ({ row, score: scoreService(label(row), needle) }))
    .filter(x => x.score >= 40)
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return [];
  const top = ranked[0].score;
  const close = ranked.filter(x => x.score >= top - 8);
  if (close.length === 1) return [close[0].row];
  return close.filter(x => x.score === top).map(x => x.row);
}

export const VOICE_YES = /^(si+|sip|vale+|ok|okay|confirmo|hazlo|adelante|guardo|guardala|guardar|dale|perfecto|correcto|claro|eso|venga|de acuerdo|por supuesto)(\b.*)?$/;

export function isVoiceYes(text: string) {
  const t = fold(text);
  if (!t) return false;
  if (VOICE_YES.test(t)) return true;
  return /^(si|vale|ok)\b/.test(t) && /guard|confirma|hazlo|adelante|dale/.test(t);
}

const ORDINALS = ['primer', 'segund', 'tercer', 'cuart', 'quint'];

/** «la primera», «la dos», «opción 3». */
export function pickSpokenIndex(text: string, n: number): number | null {
  if (n <= 0) return null;
  const t = fold(text).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < ORDINALS.length && i < n; i++) {
    if (t.includes(ORDINALS[i])) return i;
  }
  const words: Record<string, number> = { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
  const m = t.match(/^(?:la |el |opcion |la opcion )?(uno|una|dos|tres|cuatro|cinco|\d{1,2})$/);
  if (!m) return null;
  const i = words[m[1]] ?? Number(m[1]);
  if (!i || i < 1 || i > n) return null;
  return i - 1;
}

function looksLikeMarlenne(word: string) {
  const t = fold(word).replace(/[^a-zñ]/g, '');
  if (t.length < 4 || t.length > 12) return false;
  if (/marlen|malen|merlen|marlan|marlin|marleni|marleny|malene|marlene/.test(t)) return true;
  return t.startsWith('marl') || (t.startsWith('mal') && t.includes('n'));
}

const WAKE_FILLER = /^(eh+|a+|ah+|um+|uhm+|mm+|este|bueno|pues|oye|hola|dime|ya|vale|ok|okay)$/;

/** Tras el saludo: ¿viene un comando de verdad o solo «Hola Marlenne»? */
export function wakeRestIsCommand(rest: string) {
  const t = fold(rest.replace(/[¿?¡!.,]/g, ' ')).replace(/\s+/g, ' ').trim();
  if (!t || WAKE_FILLER.test(t)) return false;
  if (t.split(/\s+/).length < 2 && t.length < 8) return false;
  return true;
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
  if (/^(hola|ola|buenas)$/.test(words[0])) {
    if (words.length === 1) return { woke: true, rest: '' };
    const second = words[1].replace(/[^a-zñ]/g, '');
    if (second.length >= 3 && second.length <= 14 && /^m/.test(second)) {
      return { woke: true, rest: words.slice(2).join(' ').trim() };
    }
  }
  if (words.length === 1 && /^(oye|hey)$/.test(words[0])) {
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
