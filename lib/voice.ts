/** Comandos de voz / texto. Diccionario local: no hace falta un modelo. */

import { CATEGORIES, type CategoryId } from '@/lib/categories';
import { DAY_END, DAY_START, madridNow, nowMinutes } from '@/lib/time';

export type DayPart = 'manana' | 'tarde';

/** Franja horaria de «esta tarde» / «por la mañana». */
export function dayPartRange(part: DayPart): { fromMin: number; toMin: number } {
  return part === 'manana' ? { fromMin: DAY_START, toMin: 14 * 60 } : { fromMin: 15 * 60, toMin: DAY_END };
}

export type VoiceCmd =
  | { kind: 'go'; href: string; say: string }
  | { kind: 'today' }
  | { kind: 'search'; q: string }
  | { kind: 'status'; status: 'curso' | 'noshow'; who: string }
  | {
    kind: 'book'; who: string; startMin: number | null; serviceQ: string | null; dayOffset: number; providerQ: string | null;
    /** «Esta tarde»: franja para los huecos, si no dijo hora. */
    part?: DayPart | null;
  }
  | { kind: 'slots'; dayOffset: number; startMin: number | null; providerQ: string | null; part?: DayPart | null }
  | { kind: 'wait'; who: string | null }
  | { kind: 'cancel'; who: string; dayOffset: number }
  | { kind: 'move'; who: string; startMin: number; dayOffset: number; providerQ: string | null }
  | { kind: 'dismiss' }
  | { kind: 'help' }
  | { kind: 'chat'; say: string; stay: boolean }
  | { kind: 'unknown'; text: string };

const WEEKDAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

const HOUR_WORDS: Record<string, number> = {
  una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

const HOUR_TOKEN = `\\d{1,2}|${Object.keys(HOUR_WORDS).join('|')}`;
const DAY_RE = /(?:el |este |proximo |al |para (?:el )?|para )?((?:pasado )?manana|hoy|lunes|martes|miercoles|jueves|viernes|sabado|domingo)(?: que viene)?/;
const WEEK_NEXT_RE = /\b(?:de la |la |para la |en la )?(?:semana que viene|proxima semana|semana proxima|semana siguiente|otra semana)\b/;
const TIME_RE = new RegExp(
  `(?:a las |a la |las )(${HOUR_TOKEN})(?:[:.h](\\d{2})| y media| media| y cuarto| menos cuarto| y (\\d{2}))?`,
);
/** «mediodía», «a primera hora», «dentro de una hora»: horas sin número. */
const SPECIAL_TIME_RE = /\b(?:a |al )?(?:mediodia|medio dia|(?:a )?primera hora|(?:a )?ultima hora|dentro de (?:un cuarto de hora|media hora|una hora y media|(?:una|1) hora|(?:dos|2) horas|(?:tres|3) horas|(?:\d{1,3}) minutos|un rato))\b/;
/** «esta tarde», «por la mañana»: franja, no hora. */
const DAY_PART_RE = /\b(?:esta|por la|de|a la|en la) (manana|tarde)(?: temprano)?\b/;

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

const DAY_SPOKE = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

/** «hoy», «mañana», «el miércoles». Para oír, no para pantallas. */
export function spokenDay(offset: number) {
  if (offset === 0) return 'hoy';
  if (offset === 1) return 'mañana';
  if (offset === 2) return 'pasado mañana';
  const { y, m, d } = madridNow();
  const todayMon0 = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return DAY_SPOKE[(todayMon0 + offset) % 7];
}

export function aLasDe(min: number) {
  return /^una\b/.test(spokenClock(min)) ? 'a la' : 'a las';
}

export function earAskSave(dayOffset: number, startMin: number) {
  return `¿La guardo para ${spokenDay(dayOffset)} ${aLasDe(startMin)} ${spokenClock(startMin)}?`;
}

export function earSaved(dayOffset: number, startMin: number) {
  return `Guardo la cita para ${spokenDay(dayOffset)} ${aLasDe(startMin)} ${spokenClock(startMin)}.`;
}

export function earMove(dayOffset: number, startMin: number) {
  return `La paso a ${spokenDay(dayOffset)} ${aLasDe(startMin)} ${spokenClock(startMin)}. ¿De acuerdo?`;
}

export function earNadie(dayOffset: number, startMin: number) {
  return `Nadie libre ${spokenDay(dayOffset)} ${aLasDe(startMin)} ${spokenClock(startMin)}.`;
}

export function earHueco(dayOffset: number, startMin: number) {
  return `Hay hueco ${spokenDay(dayOffset)} ${aLasDe(startMin)} ${spokenClock(startMin)}.`;
}

export function earAskTime(dayOffset: number) {
  return dayOffset === 0 ? '¿A qué hora?' : `¿A qué hora para ${spokenDay(dayOffset)}?`;
}

function spokenList(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} o ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`;
}

/** Horas sueltas, sin nombres. La lista va en pantalla. */
export function earTengo(mins: number[]) {
  const clocks = mins.slice(0, 4).map(spokenClock);
  if (!clocks.length) return '';
  return `Tengo ${spokenList(clocks)}.`;
}

export function earHuecos(dayOffset: number, mins: number[]) {
  if (!mins.length) return 'No quedan huecos.';
  const tengo = earTengo(mins);
  if (dayOffset === 0) return tengo;
  return `Huecos ${spokenDay(dayOffset)}. ${tengo}`;
}

export function earAskTimeHoles(dayOffset: number, mins: number[]) {
  const ask = earAskTime(dayOffset);
  return mins.length ? `${ask} ${earTengo(mins)}` : ask;
}

export function earHoraOcupada(mins: number[]) {
  return mins.length ? `Esa hora no está libre. ${earTengo(mins)}` : 'Esa hora no está libre.';
}

const CITA_COUNTS = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'] as const;

/** Resumen de hoy sin nombres. La lista va en pantalla. */
export function earTodayCount(n: number) {
  if (n <= 0) return 'Hoy no hay citas.';
  if (n === 1) return 'Hoy hay una cita.';
  if (n <= 12) return `Hoy hay ${CITA_COUNTS[n]} citas.`;
  return 'Hoy hay citas.';
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
  if (m[0].includes('y media') || /\bmedia\b/.test(m[0])) minutes = '30';
  else if (m[0].includes('y cuarto')) minutes = '15';
  else if (m[2]) minutes = m[2];
  else if (m[3]) minutes = m[3];
  return parseClock(`${m[1]}:${minutes}`);
}

const SERVICE_WORD = /terapia|cavit|vacum|vacuum|preso|radiofrec|laser|masaje|hifu|facial|corporal|criolip|microblad|onnafit|lipolaser|purifying|bloom|radiance|depilacion/;

/** Días y muletillas: no son nombre de profesional. */
const NOT_PROVIDER = /^(manana|hoy|tarde|noche|hueco|libre|cita|esta|lunes|martes|miercoles|jueves|viernes|sabado|domingo)$/;

function takeProvider(s: string): { text: string; providerQ: string | null } {
  const con = s.match(/ con (?!las |la |el |hoy )([a-zñ]+)/);
  if (con && !SERVICE_WORD.test(con[1]) && !NOT_PROVIDER.test(con[1])) {
    return {
      text: `${s.slice(0, con.index)} ${s.slice((con.index ?? 0) + con[0].length)}`.replace(/\s+/g, ' ').trim(),
      providerQ: con[1],
    };
  }
  const de = s.match(/(?:huecos?|libre|libres|disponib\w*) de ([a-zñ]+)/);
  if (de && !NOT_PROVIDER.test(de[1])) return { text: s, providerQ: de[1] };
  const puede = s.match(/(?:puede|tiene|atiende) (?!hueco|libre|cita)([a-zñ]+)/);
  if (puede && !NOT_PROVIDER.test(puede[1]) && !SERVICE_WORD.test(puede[1])) {
    return { text: s, providerQ: puede[1] };
  }
  return { text: s, providerQ: null };
}

/** Días hasta el lunes de la semana que viene (1..7). */
function nextWeekMonday() {
  const { y, m, d } = madridNow();
  const todayMon0 = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return 7 - todayMon0;
}

/** «mejor mañana», «el jueves», «la semana que viene» → días desde hoy. Null si no nombra un día. */
export function saidDayOffset(text: string): number | null {
  const t = fold(text);
  if (!DAY_RE.test(t) && !WEEK_NEXT_RE.test(t.replace(DAY_PART_RE, ' '))) return null;
  return takeDay(t.replace(DAY_PART_RE, ' ')).dayOffset;
}

/** «esta tarde», «por la mañana»: se quita del texto y se devuelve la franja. */
function takeDayPart(s: string): { text: string; part: DayPart | null } {
  const m = s.match(DAY_PART_RE);
  if (!m) return { text: s, part: null };
  return {
    text: `${s.slice(0, m.index)} ${s.slice((m.index ?? 0) + m[0].length)}`.replace(/\s+/g, ' ').trim(),
    part: m[1] as DayPart,
  };
}

function takeDay(s: string): { text: string; dayOffset: number } {
  const week = WEEK_NEXT_RE.test(s);
  const t = week ? s.replace(WEEK_NEXT_RE, ' ').replace(/\s+/g, ' ').trim() : s;
  const m = t.match(DAY_RE);
  if (!m) return week ? { text: t, dayOffset: nextWeekMonday() } : { text: s, dayOffset: 0 };
  const i = WEEKDAYS.indexOf(m[1] as typeof WEEKDAYS[number]);
  const off = week && i >= 0 ? nextWeekMonday() + i : weekdayOffset(m[1]);
  return {
    text: `${t.slice(0, m.index)} ${t.slice((m.index ?? 0) + m[0].length)}`.replace(/\s+/g, ' ').trim(),
    dayOffset: off ?? 0,
  };
}

function roundUp15(min: number) {
  return Math.ceil(min / 15) * 15;
}

/** Horas dichas sin número. Null si no hay. */
function specialClock(t: string): number | null {
  const m = t.match(SPECIAL_TIME_RE);
  if (!m) return null;
  const s = m[0];
  if (/mediodia|medio dia/.test(s)) return 12 * 60;
  if (/primera hora/.test(s)) return DAY_START;
  if (/ultima hora/.test(s)) return DAY_END - 60;
  let delta = 30;
  if (/cuarto de hora/.test(s)) delta = 15;
  else if (/hora y media/.test(s)) delta = 90;
  else if (/(una|1) hora/.test(s)) delta = 60;
  else if (/(dos|2) horas/.test(s)) delta = 120;
  else if (/(tres|3) horas/.test(s)) delta = 180;
  else if (/(\d{1,3}) minutos/.test(s)) delta = Number(s.match(/(\d{1,3}) minutos/)![1]);
  return Math.min(DAY_END - 15, roundUp15(nowMinutes() + delta));
}

const BARE_TIME = new RegExp(
  `^(?:a )?(?:las |la )?(${HOUR_TOKEN})(?:[:.h](\\d{2})| y media| media| y cuarto| y (\\d{2})| menos cuarto)?$`,
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
  const special = specialClock(t);
  if (special !== null) return { startMin: special };
  const bare = t.match(BARE_TIME);
  if (bare) return { startMin: clockFromMatch(bare) };
  return { startMin: null };
}

function stripTime(s: string) {
  return s.replace(TIME_RE, ' ').replace(SPECIAL_TIME_RE, ' ').replace(/\s+/g, ' ').trim();
}

function parseSlots(t: string): VoiceCmd | null {
  if (!/(hueco|libre|disponib|cuando puede|a que hora|hay sitio|quien puede|quien esta libre|me cabe|tienes sitio)/.test(t)) {
    return null;
  }
  const p = takeProvider(t);
  const part = takeDayPart(p.text);
  const d = takeDay(part.text);
  const time = takeTime(d.text);
  return { kind: 'slots', dayOffset: d.dayOffset, startMin: time.startMin, providerQ: p.providerQ, part: part.part };
}

function looksLikeService(s: string) {
  const c = serviceNeedle(s).compact;
  if (!c || c.length < 4) return false;
  if (SERVICE_ALIASES[c]) return true;
  if (SERVICE_WORD.test(c)) return true;
  return false;
}

/** Si han dicho un servicio (también «es corporal», «mejor vacum»). */
export function saidService(text: string) {
  const t = fold(text).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^(es |el |la |un |una |mejor |el de |la de )+/, '');
  return looksLikeService(t);
}

/** «de media hora», «de una hora», «con cavitación»: variante, no servicio. */
const VARIANT_TAIL = /^(?:media hora|un cuarto de hora|una hora(?: y media)?|hora y media|dos horas|tres horas|\d+ ?min(?:utos)?|cavitacion|con cavitacion|gratis|gratuita)\b/;

/** Parte en la primera palabra que ES un servicio, no en un apellido + servicio. */
function scanService(rest: string): { who: string; serviceQ: string } | null {
  const words = rest.split(/\s+/).filter(Boolean);
  for (let i = 1; i < words.length; i++) {
    if (looksLikeService(words[i])) {
      return { who: tidyWho(words.slice(0, i).join(' ')), serviceQ: words.slice(i).join(' ') };
    }
  }
  return null;
}

function takeServiceTail(rest: string): { who: string; serviceQ: string | null } {
  // «vacum a Marta» / «vacum para Marta Sanz»: orden invertido, habitual en mostrador.
  const inv = rest.match(/^(.+?) (?:para|a) (.+)$/);
  if (inv && looksLikeService(inv[1]) && !looksLikeService(inv[2])) {
    return { who: tidyWho(inv[2]), serviceQ: tidyWho(inv[1]) };
  }
  const de = rest.match(/ (?:de |a )(.+)$/);
  if (de) {
    // «Marta vacum de media hora»: el «de» es de la variante; el servicio va delante.
    if (VARIANT_TAIL.test(de[1])) {
      const head = scanService(rest.slice(0, de.index));
      if (head) return { who: head.who, serviceQ: `${head.serviceQ} ${de[0].trim()}` };
    }
    // «vacum a marta» ya cubierto arriba; «lucia de facial» sí es servicio.
    if (!looksLikeService(rest.slice(0, de.index)) && looksLikeService(de[1])) {
      return { who: tidyWho(rest.slice(0, de.index)), serviceQ: tidyWho(de[1]) };
    }
    if (looksLikeService(rest.slice(0, de.index)) && !looksLikeService(de[1])) {
      return { who: tidyWho(de[1]), serviceQ: tidyWho(rest.slice(0, de.index)) };
    }
    return { who: tidyWho(rest.slice(0, de.index)), serviceQ: tidyWho(de[1]) };
  }
  return scanService(rest) ?? { who: tidyWho(rest), serviceQ: null };
}

function parseBook(t: string): VoiceCmd | null {
  const saidBook = /(cita|reserv|apunt|anot|agend|ponle|hazme |crea(?:mos|r)?|hacemos )/.test(t);
  if (!saidBook && takeTime(t).startMin === null) return null;
  if (/(hueco|libre|disponib|cuando puede|a que hora|hay sitio|quien puede)/.test(t)) return null;
  if (/(cancela|anula|mueve|cambia|reprograma|pasa(?:le)? (?:la )?cita)/.test(t)) return null;

  const p = takeProvider(t);
  const part = takeDayPart(p.text);
  const d = takeDay(part.text);
  const time = takeTime(d.text);
  let rest = stripTime(d.text)
    .replace(/^(crea(?:r|mos)?(?: me)? |hace(?:r|mos)? |haz(?:me)? )/, '')
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
    part: time.startMin === null ? part.part : null,
  };
}

/**
 * «Lucía vacum una hora», sin decir «cita». Solo vale si luego la clienta existe:
 * quien llama decide, aquí solo se parte el texto.
 */
export function parseBookLoose(text: string): Extract<VoiceCmd, { kind: 'book' }> | null {
  const t = fold(text.replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim());
  if (!t || /(hueco|libre|disponib|cancela|anula|mueve|cambia|que es|cuanto|precio)/.test(t)) return null;
  const p = takeProvider(t);
  const part = takeDayPart(p.text);
  const d = takeDay(part.text);
  const time = takeTime(d.text);
  const rest = stripTime(d.text).replace(/^(para |a |de )/, '').trim();
  const split = takeServiceTail(rest);
  if (!split.serviceQ || split.who.length < 2 || split.who.split(' ').length > 3) return null;
  return {
    kind: 'book',
    who: split.who,
    startMin: time.startMin,
    serviceQ: split.serviceQ,
    dayOffset: d.dayOffset,
    providerQ: p.providerQ,
    part: time.startMin === null ? part.part : null,
  };
}

function parseCancel(t: string): VoiceCmd | null {
  if (/^(cancelar?|anular?|nada|olvidalo|olvidar|cierra|cerrar|da igual|dejalo|fuera|no)$/.test(t)) {
    return { kind: 'dismiss' };
  }
  const m = t.match(/^(?:cancela(?:r)?|anula(?:r)?|quita|borra)(?: me)?(?: (?:la |su ))?(?:cita )?(?:de |a )?(.+)$/);
  if (!m) return null;
  const d = takeDay(takeDayPart(m[1]).text);
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
  const d = takeDay(takeDayPart(stripped).text);
  const time = takeTime(d.text);
  if (time.startMin === null) return null;
  const who = tidyWho(stripTime(d.text).replace(/ a las?$| las?$/, ''));
  if (who.length < 2) return null;
  return { kind: 'move', who, startMin: time.startMin, dayOffset: d.dayOffset, providerQ: p.providerQ };
}

function chatSaid(t: string) {
  return t
    .replace(/^(hola|ola)(?:\s+|$)/, '')
    .replace(/^buenas(?! tardes| noches)\s+/, '')
    .replace(/\b(oye|eh+|a ver|por favor|porfa|marlenne|marlene|marlen|tu|usted|nena|tia|guapa|cielo)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chatCore(t: string) {
  return chatSaid(t)
    .replace(/\bque\s*tal\s*(eh\s+)?(estas|esta|stas|tas)\b/g, 'que tal estas')
    .replace(/\bcomo\s*(estas|esta|stas|tas|tes)\b/g, 'como estas')
    .replace(/\b(quetal|ke tal|k tal)\b/g, 'que tal')
    .replace(/\b(ya|pues|entonces|ahora|a ti)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chatSay(say: string, stay = true): VoiceCmd {
  return { kind: 'chat', say, stay };
}

/** Dictado típico de «qué tal estás». No pisa «qué tal el día». */
function isHowAreYou(s: string) {
  if (/\b(el dia|citas|agenda|hueco|cabina|quien|hora)\b/.test(s)) return false;
  const c = s.replace(/[^a-z0-9ñ]/g, '');
  if (/(quetalestas|quetalesta|quetalandas|quetalteva|comoteva|comoestas|comoesta|comoteencuentras|todobien|estasbien|quetalporahi)/.test(c)) {
    return true;
  }
  return /\b(que tal estas|que tal esta|que tal|como estas|como esta|como te va|como andas|como te encuentras|todo bien|estas bien|que hay de ti|que tal por ahi|que tal va|que tal la vida|como te sientes|que tal andas)\b/.test(s);
}

type ChatRow = { re: RegExp; c?: RegExp; say: string; stay?: boolean };

/** Preguntas de recepción. Gratis: no hay modelo. Las respuestas reutilizan clips. */
const CHAT: ChatRow[] = [
  { re: /^(gracias|muchas gracias|mil gracias|gracias a ti|te lo agradezco)(\s+\w+){0,3}$/, say: 'De nada.' },
  { re: /^(buenos dias|buen dia|muy buenos|muy buenos dias)$/, say: 'Buenos días. ¿Qué hacemos?' },
  { re: /^(buenas tardes)$/, say: 'Buenas tardes. ¿Qué hacemos?' },
  { re: /^(buenas noches)$/, say: 'Buenas noches. ¿Qué hacemos?' },
  { re: /^(adios|hasta luego|chao|nos vemos|ya esta|eso es todo|nada mas|me voy|hasta manana)$/, say: 'Hasta luego.', stay: false },
  { re: /^(me oyes|estas ahi|sigues ahi|me escuchas|hola hola|seguimos)$/, say: 'Te escucho.' },
  { re: /^(quien eres|como te llamas|que eres|presentate)$/, say: 'Soy Marlén, la agenda.' },
  { re: /^(puedes ayudarme|ayudame|que sabes hacer|para que sirves|que haces tu)$/, say: 'Sí. Citas, huecos, cabina.' },
  { re: /^(perdona|perdon|lo siento|sorry|disculpa)$/, say: 'No pasa nada.' },
  { re: /^(igualmente)$/, say: 'Igualmente.' },
  { re: /^(encantada|encantado|un placer|mucho gusto)$/, say: 'Encantada.' },
  { re: /^(repite|que has dicho|no te he oido|como|perdon no oigo)$/, say: '¿Lo repites?' },
  { re: /^(precios?|cuanto (vale|cuesta|es)|tarifas?|que cuesta)$/, say: 'Los precios están en Servicios.' },
  { re: /^(eres un sol|que maja|que mona|muy maja|que buena|que maja eres|un encanto|eres un encanto)$/, say: 'Tú más.' },
  { re: /^(eres la mejor|la mejor|que lista|eres lista|que inteligente|que rapida)$/, say: 'Hoy sí. ¿Qué toca?' },
  { re: /^(muy bien|que bien|genial|perfecto|estupendo|fenomenal|vale vale)$/, say: 'Gracias. ¿Algo más?' },
  { re: /^(te quiero|te quiero mucho|besos|un beso)$/, say: 'Y yo, la agenda.' },
  { re: /^(jaja|jajaja|jeje|me rio|que gracia|que risa)$/, say: 'Me río yo también. ¿Seguimos?' },
  { re: /^(estas tonta|que tonta|que pesada|callate|no me rayes|estas loca)$/, say: 'Bueno. ¿La cita?' },
  { re: /^(que dia|menudo dia|vaya dia|que dia mas|menuda manana|vaya manana|vaya tela)$/, say: 'De esos. ¿Qué hay hoy?' },
  { re: /^(estoy cansada|estoy cansado|que cansancio|estoy muerta|no puedo mas)$/, say: 'Un hueco y a casa.' },
  { re: /^(hace calor|que calor|asfixia|que bochorno)$/, say: 'Pues un facial viene bien.' },
  { re: /^(hace frio|que frio|que invierno|que viento)$/, say: 'Pues un facial viene bien.' },
  { re: /^(tengo hambre|que hambre|vamos a comer|a comer)$/, say: 'Después de la cita, mejor.' },
  { re: /^(es lunes|que lunes|odioso lunes|lunes eterno)$/, say: 'Lo sé. ¿Empezamos?' },
  { re: /^(feliz viernes|por fin viernes|es viernes|albricias viernes)$/, say: 'Y a vosotras. ¿El día?' },
  { re: /^(me caes bien|me cae bien|caigo bien|me gustas)$/, say: 'Recíproco. ¿Qué hay?' },
  { re: /^(quiero un cafe|un cafe|cafe|un te|un vaso de agua)$/, say: 'Ojalá. Yo solo apunto. ¿Algo más?' },
  { re: /^(llueve|esta lloviendo|que lluvia|que dia mas feo)$/, say: 'Mal para el pelo, bien para huecos.' },
  { re: /^(el wifi|no va (el )?wifi|se ha caido|no hay internet|no carga)$/, say: 'Eso no lo arreglo. ¿Una cita?' },
  { re: /^(la jefa|manda la jefa|quien manda)$/, say: 'Aquí mando la agenda. Es broma.' },
  { re: /^(todo el mundo|todo a la vez|un lio|vaya lio|se ha liado|no doy abasto|hasta arriba|estamos liadas)$/, say: 'Una a una. ¿Quién primero?' },
  { re: /^(otra vez yo|otra vez|sigo yo)$/, say: 'Te escucho.' },
  { re: /^(se me olvido|me olvide|olvidado|se me ha ido)$/, say: 'Por eso estoy yo.' },
  { re: /^(no se|ni idea|no me acuerdo)$/, say: 'Nombre y hora, y lo vemos.' },
  { re: /^(estoy perdida|estoy perdido|no me entero|como se hace)$/, say: 'Tranquila. ¿Cita, hueco o ficha?' },
  { re: /^(que aburrida|que aburrido|aburrida)$/, say: 'Pues una cita lo anima.' },
  { re: /^(es una sorpresa|es sorpresa|sorpresa)$/, say: 'Ni una palabra. ¿El nombre?' },
  { re: /^(es un regalo|un regalo|para regalar|es para regalar)$/, say: 'Bonito. ¿La apuntamos?' },
  { re: /^(primera vez|es la primera|no ha venido nunca|es nueva)$/, say: 'Alta y cita. ¿El nombre?' },
  { re: /^(viene sin cita|sin cita|ha venido sin cita|esta en la puerta|esta en recepcion|ha llegado( ya)?)$/, say: 'Miro un hueco.' },
  { re: /^(es urgente|urgente|viene ya|de ya|ahora mismo)$/, say: 'Miro el primer hueco.' },
  { re: /^(me he equivocado de hora|hora mal|hora equivocada|me he colado de hora)$/, say: 'La movemos. ¿A cuál?' },
  { re: /^(no va a venir|no viene|ya no viene|ha cancelado ella)$/, say: '¿La marco como no vino?' },
  { re: /^(esta aparcando|esta aparcando ya|aparca|esta bajando)$/, say: 'Dile que no corra.' },
  { re: /^(esta en el bano|en el aseo|en el wc)$/, say: 'Vale. Aviso cuando salga.' },
  { re: /^(viene con amiga|vienen dos|las dos|vienen las dos)$/, say: '¿Las dos? Dime nombres.' },
  { re: /^(te has equivocado|eso no|mal|no es eso)$/, say: '¿Lo repites?' },
  { re: /^(feliz cumple|feliz cumpleanos|cumpleanos)$/, say: 'Gracias. ¿Lo celebramos con una cita?' },
  { re: /^(felices fiestas|feliz navidad|prospero ano)$/, say: 'Igualmente. ¿Apuntamos?' },
  { re: /^(buenas vacaciones|felices vacaciones|buenas vacas)$/, say: 'Disfrutad. Yo me quedo con la agenda.' },
  { re: /^(es tarde|ya es tarde|se hace tarde)$/, say: 'Aún se puede. ¿Un hueco?' },
  { re: /^(estoy de mal humor|que mal humor|hoy no|hoy fatal)$/, say: 'Hoy va suave. ¿Quién viene?' },
  { re: /^(hoy no quiero hablar|no quiero hablar|sin hablar)$/, say: 'Solo toca. Aquí estoy.' },
  { re: /^(cliente dificil|esta dificil|que pesada la clienta)$/, say: 'Con calma. ¿La ficha?' },
  { re: /^(animo|fuerza|aguanta|vamos alla)$/, say: 'Lo sé. ¿Empezamos?' },
  { re: /^(descansa|que descanses|a casa)$/, say: 'Hasta luego.', stay: false },
  { re: /^(estas lista|preparada|listas)$/, say: 'Te escucho.' },
  { re: /^(un segundo|espera|espera un momento|un momentito)$/, say: 'Cuando quieras.' },
  { re: /^(vale gracias|ok gracias|perfecto gracias)$/, say: 'De nada.' },
  { re: /^(no pasa nada|tranquila|tranquilo)$/, say: 'Tranquila.' },
  { re: /^(como va eso|que hay|que pasa|que hacemos|a que estamos)$/, say: 'Bien, aquí. ¿Una cita o un hueco?' },
  { re: /^(todo ok|todo correcto|vamos bien)$/, say: 'Gracias. ¿Algo más?' },
  { re: /^(ha llamado|han llamado|hay un recado)$/, say: 'Nombre y hora, y lo vemos.' },
  { re: /^(esta llena|estamos llenas|no cabe nadie)$/, say: 'Miro un hueco.' },
  { re: /^(la proxima|siguiente|quien sigue)$/, say: 'De esos. ¿Qué hay hoy?' },
  { re: /^(me aburro|esto esta parado)$/, say: 'Pues una cita lo anima.' },
  { re: /^(eres rapida|que rapida eres|vaya maquina)$/, say: 'Hoy sí. ¿Qué toca?' },
  { re: /^(buenas|muy buenas)$/, say: 'Te escucho.' },
  { re: /^(de nada|a ti)$/, say: 'Cuando quieras.' },
  { re: /^(esta esperando|esta sentada|ha venido antes|llego pronto|llego temprano)$/, say: 'Que se siente. Aviso a cabina.' },
  { re: /^(lleva un rato|lleva rato esperando|esta tardando la cabina)$/, say: 'Lleva un rato. Aviso.' },
  { re: /^(la paso|la paso ya|entro o espera|la dejo esperar)$/, say: '¿La paso a cabina o espera?' },
  { re: /^(preguntan por un hueco|buscan hueco|hay hueco por telefono|llaman por hueco)$/, say: '¿Qué día y a qué hora?' },
  { re: /^(se ha puesto enferma|falta una|falta una profesional|no viene una|esta de baja)$/, say: 'Miro huecos de las demás.' },
  { re: /^(a que hora cerramos|cuando cerramos|hasta que hora|cerramos pronto|a que hora cierra)$/, say: 'Hasta las ocho. ¿Un hueco?' },
  { re: /^(abrimos manana|a que hora abrimos|manana abrimos|cuando abrimos)$/, say: 'Mañana a las nueve. ¿Apuntamos?' },
  { re: /^(paga en efectivo|paga con tarjeta|bizum|con tarjeta|en efectivo|como paga|quiere factura)$/, say: 'Eso en caja. Yo apunto la cita.' },
  { re: /^(tiene bono|usa el bono|lleva bono|es de bono|cuanto queda del bono|le queda bono)$/, say: 'En la ficha, en Bonos.' },
  { re: /^(quiere cambiar de profesional|otra profesional|no quiere ir con ella|cambia de cabina)$/, say: '¿Con quién la quieres?' },
  { re: /^(dice que tenia cita|tenia cita|dice que esta apuntada|no la encuentro y dice que si)$/, say: 'Miro si está apuntada.' },
  { re: /^(llega tarde|avisa que se retrasa|se retrasa|viene tarde|llega en cinco)$/, say: 'Aviso a cabina.' },
  { re: /^(diez minutos|en diez|se retrasa diez|diez min)$/, say: 'Diez minutos. Aviso.' },
  { re: /^(la cabina esta ocupada|no esta lista la cabina|cabina ocupada|aun no esta lista)$/, say: 'En cuanto quede libre.' },
  { re: /^(se alarga|se esta alargando|va con retraso|el tratamiento se alarga)$/, say: 'Aviso a la siguiente.' },
  { re: /^(tiene que firmar|el consentimiento|consentimiento|hay que firmar|las normas)$/, say: 'La ficha y el consentimiento.' },
  { re: /^(es menor|viene una menor|es una nina|con la madre)$/, say: 'Hace falta tutor. ¿La ficha?' },
  { re: /^(no tiene movil|no tiene telefono|sin telefono|no hay numero)$/, say: 'Apunto sin SMS.' },
  { re: /^(no quiere sms|sin sms|que no le avise|no la avises)$/, say: 'Sin aviso. ¿La cita?' },
  { re: /^(esta embarazada|viene embarazada|es embarazo)$/, say: 'Miro qué se puede. ¿El servicio?' },
  { re: /^(viene con ninos|trae a los ninos|viene con el nino|con carrito)$/, say: 'Que se sienten. ¿La cita?' },
  { re: /^(es la de siempre|la de siempre|la habitual|como siempre)$/, say: 'Dime el nombre.' },
  { re: /^(esta duplicada|hay dos citas|se ha duplicado|sale dos veces)$/, say: 'Miro cuál dejamos.' },
  { re: /^(es festivo|estamos de puente|no se abre|cerramos el festivo|es puente)$/, say: 'Si no abrimos, no apunto.' },
  { re: /^(quiere cancelar|hay que cancelar|anular cita|van a cancelar)$/, say: '¿De quién es la cita?' },
  { re: /^(quiere cambiarla|hay que moverla|la cambiamos|reprogramar)$/, say: '¿A quién muevo y a qué hora?' },
  { re: /^(es laser|viene de laser|quiere laser|depilacion|quiere depilarse)$/, say: 'Láser. ¿Nombre y hora?' },
  { re: /^(es facial|viene de facial|quiere facial|un facial)$/, say: 'Facial. ¿Nombre y hora?' },
  { re: /^(es corporal|viene de corporal|quiere corporal|cavitacion|vacum)$/, say: 'Corporal. ¿Nombre y hora?' },
  { re: /^(es masaje|quiere masaje|un masaje)$/, say: 'Masaje. ¿Nombre y hora?' },
  { re: /^(es micro|microblading|quiere micro|cejas)$/, say: 'Micro. ¿Nombre y hora?' },
  { re: /^(es valoracion|quiere valoracion|solo valoracion|asesoria)$/, say: 'Valoración. ¿Nombre y hora?' },
  { re: /^(paga la amiga|invita ella|lo paga otra|regalo de la amiga)$/, say: 'Da igual. ¿El nombre de la cita?' },
  { re: /^(cerramos|ya esta el dia|se acabo|ultima cita|es la ultima)$/, say: '¿Queda alguna?' },
  { re: /^(el ipad no va|no va el ipad|se ha colgado|no carga la app)$/, say: 'Prueba a recargar. Yo sigo.' },
  { re: /^(no me deja guardar|no se guarda|falla al guardar|error al guardar)$/, say: 'Nombre y hora otra vez.' },
  { re: /^(le ha sentado mal|le duele|esta incomoda|reaccion)$/, say: 'Aviso. ¿La ficha?' },
  { re: /^(quiere fotos|las fotos|medidas|el antes y despues)$/, say: 'Las fotos no van aquí. La cita sí.' },
  { re: /^(quieren confirmar|llama para confirmar|confirma la cita)$/, say: 'Para confirmar, el nombre.' },
  { re: /^(esta menstruando|viene con la regla|tiene la regla)$/, say: 'Aviso a cabina.' },
  { re: /^(viene de otra clinica|es de fuera|nueva de otro sitio)$/, say: 'Alta y cita. ¿El nombre?' },
  { re: /^(ha visto instagram|viene de instagram|es de redes)$/, say: 'Bonito. ¿La apuntamos?' },
];

function parseChat(t: string): VoiceCmd | null {
  const s = chatCore(t);
  if (!s) return null;
  if (isHowAreYou(s)) return chatSay('Bien, aquí. ¿Una cita o un hueco?');
  if (/^(que hora es|que hora tenemos|dime la hora|la hora)$/.test(s)) {
    const { h, min } = madridNow();
    return chatSay(`Las ${spokenClock(h * 60 + min)}.`);
  }
  const c = s.replace(/[^a-z0-9ñ]/g, '');
  for (const row of CHAT) {
    if (row.c && row.c.test(c)) return chatSay(row.say, row.stay !== false);
    if (row.re.test(s)) return chatSay(row.say, row.stay !== false);
  }
  return null;
}

/** «Creamos una cita» sin nombre: abre el alta. Si hay nombre, lo pilla parseBook. */
function parseOpenNew(t: string): VoiceCmd | null {
  const s = t
    .replace(/^(vamos a |podemos |puedes |quiero |necesito |hay que |me ayudas a |ayudame a |podemos )/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (
    /^(crea(?:r|mos)?|hace(?:r|mos)?|abre|abrir|pon(?:me)?|apunta(?:mos)?|anota(?:mos)?|agenda(?:r|mos)?)( me)?( una)?( nueva)? cita$/.test(s)
    || /^(nueva cita|una cita|apuntar|anotar|agendar|reservar|quiero cita|dame cita|pon cita)$/.test(s)
  ) {
    return { kind: 'go', href: '/agenda?new=1', say: 'Nueva cita' };
  }
  return null;
}

function stripWakePrefix(raw: string) {
  const wake = splitWake(raw);
  return wake.woke && wake.rest ? wake.rest : raw;
}

export function parseVoice(text: string): VoiceCmd {
  const raw = stripWakePrefix(text.replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim());
  const t = fold(raw);
  if (!t) return { kind: 'unknown', text: raw };

  const chat = parseChat(t);
  if (chat) return chat;

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
    || t.includes('cuantas quedan')
    || t.includes('cuantas faltan')
    || t.includes('quien viene hoy')
    || t.includes('ensename hoy')
    || t.includes('el resumen')
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
  const opened = parseOpenNew(t);
  if (opened) return opened;
  if (/^(bonos|el bono|los bonos|abre bonos|abre los bonos|packs|los packs)$/.test(t)) {
    return { kind: 'go', href: '/ajustes/bonos', say: 'Abro Bonos.' };
  }
  if (/^(servicios|los servicios|el catalogo|abre servicios|abre los servicios|las tarifas|el tarifario)$/.test(t)) {
    return { kind: 'go', href: '/ajustes/servicios', say: 'Abro Servicios.' };
  }
  if (/^(el equipo|las chicas|quien trabaja|abre el equipo)$/.test(t)) {
    return { kind: 'go', href: '/ajustes/equipo', say: 'Abro el equipo.' };
  }
  if (/^(no veo la cita|no aparece|no esta en la agenda|no la veo)$/.test(t)) {
    return { kind: 'go', href: '/agenda', say: 'Abro la agenda.' };
  }
  const booked = parseBook(t);
  if (booked) return booked;

  m = t.match(/^(?:busca(?:r)?|ficha(?: de)?|abre(?: la ficha de)?|datos de|clienta) (?:a )?(.+)$/);
  if (m) return { kind: 'search', q: tidyWho(m[1]) };
  if (t === 'clientas' || t === 'fichas') {
    return { kind: 'go', href: '/clientas', say: 'Clientas' };
  }

  if (/^(agenda|calendario)$/.test(t)) {
    return { kind: 'go', href: '/agenda', say: 'Agenda' };
  }
  if (/^(ajustes|configuracion|mas)$/.test(t)) {
    return { kind: 'go', href: '/ajustes', say: 'Ajustes' };
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
  vacumoterapia: 'vacumterapia',
  vaumterapia: 'vacumterapia',
  vaku: 'vacumterapia',
  vakum: 'vacumterapia',
  vacun: 'vacumterapia',
  bakum: 'vacumterapia',
  vaconterapia: 'vacumterapia',
  conterapia: 'vacumterapia',
  conterpia: 'vacumterapia',
  conterpi: 'vacumterapia',
  conterapi: 'vacumterapia',
  conterapias: 'vacumterapia',
  vacumterapiacavitacion: 'vacumterapiacavitacion',
  vacumterapiaycavitacion: 'vacumterapiacavitacion',
  vacumterapiamascavitacion: 'vacumterapiacavitacion',
  presioterapia: 'presoterapia',
  presoterapia: 'presoterapia',
  crioliposis: 'criolipolisis',
  criolipolisis: 'criolipolisis',
  crio: 'criolipolisis',
  criolipo: 'criolipolisis',
  crioterapia: 'criolipolisis',
  cavi: 'cavitacion',
  lipo: 'lipolaser',
  info: 'infoasesoramiento',
  asesoramiento: 'infoasesoramiento',
  radio: 'radiofrecuencia',
  radiofrecuencias: 'radiofrecuencia',
  hifus: 'hifu',
  ifu: 'hifu',
  jifu: 'hifu',
  express: 'tratamientoexpress',
  expres: 'tratamientoexpress',
  lifting: 'facialradiancelifting',
  radiance: 'facialradiancelifting',
  bloom: 'facialbloom',
  blum: 'facialbloom',
  microblading: 'microblading',
  microblending: 'microblading',
  micro: 'microblading',
  cabitacion: 'cavitacion',
  gravitacion: 'cavitacion',
  cavitacion: 'cavitacion',
};

function normalizeServiceHeard(raw: string) {
  return fold(raw)
    .replace(/[«»"'¿?¡!]/g, ' ')
    .replace(/^(pues |mira |vale |una |un |de |el |la |le hacemos |hacemos |quiero |ponle |para ella )/, '')
    .replace(/\bva con\b/g, 'vacum')
    .replace(/\bba con\b/g, 'vacum')
    .replace(/\b(una |el |la )?con terapia\b/g, 'vacumterapia')
    .replace(/\bcon terpia\b/g, 'vacumterapia')
    .replace(/\bconterapia\b/g, 'vacumterapia')
    .replace(/\bconterpia\b/g, 'vacumterapia')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Texto de servicio como lo dijo, con los oídos típicos del dictado ya corregidos. */
export function hearService(raw: string) {
  return normalizeServiceHeard(raw);
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

export function editDist(a: string, b: string) {
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

/** Tras el saludo: ¿viene un comando (o un nombre) o solo «Hola Marlén»? */
export function wakeRestIsCommand(rest: string) {
  const t = fold(rest.replace(/[¿?¡!.,]/g, ' ')).replace(/\s+/g, ' ').trim();
  if (!t || WAKE_FILLER.test(t)) return false;
  return true;
}

/** «Hola Marlén» / «oye Marlene»… y el resto del comando, si vino en el mismo aliento. */
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
