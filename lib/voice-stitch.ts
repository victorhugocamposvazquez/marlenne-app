import { DAY_END, DAY_START } from '@/lib/time';
import { aLasDe, fold, forEar, spokenClock } from '@/lib/voice';
import { voiceClipUrl } from '@/lib/voice-clips';

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

function cleanEar(text: string) {
  return fold(forEar(text))
    .replace(/[¿¡.!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Frase hecha de clips (día + hora + plantilla). Null = ir a la nube.
 * El nombre no entra: va en pantalla.
 */
export function stitchVoice(text: string): string[] | null {
  const whole = voiceClipUrl(text) ?? voiceClipUrl(forEar(text));
  if (whole) return [whole];

  let ear = cleanEar(text);
  if (!ear) return null;
  const agree = /\bde acuerdo$/.test(ear);
  if (agree) ear = ear.replace(/\bde acuerdo$/, '').trim();

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
  if ((agree || row.agree) && voiceClipUrl('¿De acuerdo?')) urls.push(voiceClipUrl('¿De acuerdo?')!);
  return urls;
}
