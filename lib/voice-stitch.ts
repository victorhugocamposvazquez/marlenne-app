import { DAY_END, DAY_START } from '@/lib/time';
import { aLasDe, fold, forEar, spokenClock } from '@/lib/voice';
import { voiceClipUrl } from '@/lib/voice-clips';
import { VARIANT_LABELS } from '@/lib/voice-services';

const VARIANTS = new Set(VARIANT_LABELS.map(fold));

/** Silencio entre opciones, en ms. `playUrls` lo entiende. */
export const PAUSE = 'pause:140';

/** «¿De media hora, de una hora o con cavitación?» → clips con «o» y pausas. */
function stitchVariants(text: string): string[] | null {
  const q = forEar(text).replace(/[¿¡]/g, '').replace(/[?.!]+$/g, '').trim();
  const items = q.split(/,\s*|\s+o\s+/).map(s => s.trim()).filter(Boolean);
  if (items.length < 2 || !items.every(i => VARIANTS.has(fold(i)))) return null;
  const o = voiceClipUrl('o');
  if (!o) return null;
  const urls: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const clip = voiceClipUrl(items[i]);
    if (!clip) return null;
    if (i > 0) urls.push(i === items.length - 1 ? o : PAUSE);
    urls.push(clip);
  }
  return urls;
}

const DAY_IDS: Record<string, string> = {
  hoy: 'dia-hoy',
  manana: 'dia-manana',
  'pasado manana': 'dia-pasado-manana',
  lunes: 'dia-lunes',
  martes: 'dia-martes',
  miercoles: 'dia-miercoles',
  jueves: 'dia-jueves',
  viernes: 'dia-viernes',
  sabado: 'dia-sabado',
  domingo: 'dia-domingo',
};

const DAYS = Object.keys(DAY_IDS).sort((a, b) => b.length - a.length);

const PREFIXES: { key: string; glue: string; agree?: boolean; noHour?: boolean }[] = [
  { key: 'guardo la cita para', glue: 'Guardo la cita para' },
  { key: 'la guardo para', glue: '¿La guardo para' },
  { key: 'la paso a', glue: 'La paso a', agree: true },
  { key: 'nadie libre', glue: 'Nadie libre' },
  { key: 'hay hueco', glue: 'Hay hueco' },
  { key: 'a que hora para', glue: '¿A qué hora para', noHour: true },
];

export function voiceHourMins() {
  const out: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 15) out.push(m);
  return out;
}

export function voiceClockUrl(min: number) {
  if (min < DAY_START || min > DAY_END || min % 15 !== 0) return null;
  return `/voice/hora-${min}.mp3`;
}

export function voiceDayUrl(day: string) {
  const id = DAY_IDS[fold(day)];
  return id ? `/voice/${id}.mp3` : null;
}

const CLOCKS = voiceHourMins()
  .map(min => ({ min, text: fold(spokenClock(min)) }))
  .sort((a, b) => b.text.length - a.text.length);

function takeClockEnd(s: string) {
  for (const row of CLOCKS) {
    if (s === row.text) return { rest: '', min: row.min };
    if (s.endsWith(` ${row.text}`)) return { rest: s.slice(0, -row.text.length).trim(), min: row.min };
  }
  return null;
}

function takeDayEnd(s: string) {
  const t = s.replace(/\bel\s+/g, ' ').replace(/\s+/g, ' ').trim();
  for (const d of DAYS) {
    if (t === d) return { rest: '', day: d };
    if (t.endsWith(` ${d}`)) return { rest: t.slice(0, -d.length).trim(), day: d };
  }
  return null;
}

function takeDayStart(s: string) {
  const t = s.replace(/^el\s+/, '').trim();
  for (const d of DAYS) {
    if (t === d) return { rest: '', day: d };
    if (t.startsWith(`${d} `)) return { rest: t.slice(d.length).trim(), day: d };
  }
  return null;
}

function cleanEar(text: string) {
  return fold(forEar(text))
    .replace(/[¿¡.!?]/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hourUrls(mins: number[]) {
  const urls = mins.map(voiceClockUrl);
  if (!urls.length || urls.some(u => !u)) return null;
  return urls as string[];
}

function takeHourList(s: string) {
  let t = s.replace(/\so\s/g, ' ').replace(/\s+/g, ' ').trim();
  const mins: number[] = [];
  while (t) {
    const hit = CLOCKS.find(row => t === row.text || t.startsWith(`${row.text} `));
    if (!hit) break;
    mins.push(hit.min);
    t = t.slice(hit.text.length).trim();
  }
  return mins.length ? { rest: t, mins } : null;
}

function glueTengo(mins: number[]) {
  const tengo = voiceClipUrl('Tengo');
  const hours = hourUrls(mins);
  return tengo && hours ? [tengo, ...hours] : null;
}

function stitchTengoPhrase(ear: string): string[] | null {
  if (ear.startsWith('esa hora no esta libre')) {
    const rest = ear.slice('esa hora no esta libre'.length).trim();
    const head = voiceClipUrl('Esa hora no está libre.');
    if (!head) return null;
    if (!rest) return [head];
    if (!rest.startsWith('tengo')) return null;
    const hours = takeHourList(rest.slice('tengo'.length).trim());
    const tail = hours && !hours.rest ? glueTengo(hours.mins) : null;
    return tail ? [head, ...tail] : null;
  }

  if (ear.startsWith('a que hora para')) {
    const rest = ear.slice('a que hora para'.length).trim();
    const day = takeDayStart(rest);
    const prefix = voiceClipUrl('¿A qué hora para');
    const dia = day ? voiceDayUrl(day.day) : null;
    if (!prefix || !day || !dia) return null;
    if (!day.rest) return [prefix, dia];
    if (!day.rest.startsWith('tengo')) return null;
    const hours = takeHourList(day.rest.slice('tengo'.length).trim());
    const tail = hours && !hours.rest ? glueTengo(hours.mins) : null;
    return tail ? [prefix, dia, ...tail] : null;
  }

  if (ear.startsWith('a que hora')) {
    const rest = ear.slice('a que hora'.length).trim();
    const head = voiceClipUrl('¿A qué hora?');
    if (!head) return null;
    if (!rest) return [head];
    if (!rest.startsWith('tengo')) return null;
    const hours = takeHourList(rest.slice('tengo'.length).trim());
    const tail = hours && !hours.rest ? glueTengo(hours.mins) : null;
    return tail ? [head, ...tail] : null;
  }

  if (ear.startsWith('huecos')) {
    const rest = ear.slice('huecos'.length).trim();
    const day = takeDayStart(rest);
    const prefix = voiceClipUrl('Huecos');
    const dia = day ? voiceDayUrl(day.day) : null;
    if (!prefix || !day || !dia) return null;
    if (!day.rest.startsWith('tengo')) return null;
    const hours = takeHourList(day.rest.slice('tengo'.length).trim());
    const tail = hours && !hours.rest ? glueTengo(hours.mins) : null;
    return tail ? [prefix, dia, ...tail] : null;
  }

  if (ear.startsWith('tengo')) {
    const hours = takeHourList(ear.slice('tengo'.length).trim());
    return hours && !hours.rest ? glueTengo(hours.mins) : null;
  }

  return null;
}

function stitchDayHour(ear: string, agree: boolean): string[] | null {
  const clock = takeClockEnd(ear);
  const afterClock = (clock?.rest ?? ear).replace(/\b(a las|a la)$/g, '').trim();
  const day = takeDayEnd(afterClock);
  if (!day) return null;
  const leftover = day.rest.trim();

  const row = PREFIXES.find(p => leftover === p.key);
  if (!row) return null;
  if (row.noHour) {
    if (clock) return null;
    const prefix = voiceClipUrl(row.glue);
    const dia = voiceDayUrl(day.day);
    return prefix && dia ? [prefix, dia] : null;
  }
  if (!clock) return null;

  const prefix = voiceClipUrl(row.glue);
  const dia = voiceDayUrl(day.day);
  const las = voiceClipUrl(aLasDe(clock.min));
  const hour = voiceClockUrl(clock.min);
  if (!prefix || !dia || !las || !hour) return null;
  const urls = [prefix, dia, las, hour];
  const ok = voiceClipUrl('¿De acuerdo?');
  if ((agree || row.agree) && ok) urls.push(ok);
  return urls;
}

/**
 * Frase hecha de clips (día + hora + plantilla). Null = ir a la nube.
 * El nombre no entra: va en pantalla.
 */
export function stitchVoice(text: string): string[] | null {
  const whole = voiceClipUrl(text) ?? voiceClipUrl(forEar(text));
  if (whole) return [whole];
  const variants = stitchVariants(text);
  if (variants) return variants;

  let ear = cleanEar(text);
  if (!ear) return null;
  const agree = /\bde acuerdo$/.test(ear);
  if (agree) ear = ear.replace(/\bde acuerdo$/, '').trim();

  return stitchTengoPhrase(ear) ?? stitchDayHour(ear, agree);
}
