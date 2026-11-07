import { fold } from '@/lib/voice';

/** Lo que Whisper suele inventarse en español cuando no hay voz. */
const GHOSTS = [
  /subtitul/,                       // «Subtítulos realizados por…», Amara.org
  /gracias por ver/,
  /suscribete/,
  /hasta la proxima/,
  /^musica$/,
  /^aplausos$/,
  /^\W*$/,
];

/** Whisper acepta ~224 tokens de prompt. Pasarse no da error: recorta por detrás. */
const PROMPT_MAX = 420;

export type SttSegment = { no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number };

export type SttVocab = { prompt: string; words: string[] };

const plain = (s: string) => fold(s).replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

/** Prompt con pinta de transcripción previa. Una lista cruda de nombres hace que
 *  Whisper los «oiga» en clips cortos; las clientas las resuelve el emparejado difuso. */
export function sttPrompt(services: string[], team: string[]): SttVocab {
  const people = [...new Set(team.map(t => t.trim()).filter(Boolean))].slice(0, 6);
  const names = [...new Set(services.map(s => s.trim()).filter(Boolean))];
  const head = people.length
    ? `Cita mañana a las once con ${people.join(' o con ')}.`
    : 'Cita mañana a las once.';
  let prompt = head;
  const used: string[] = [];
  for (const s of names) {
    const next = `${prompt}${used.length ? ', ' : ' '}${s}`;
    if (next.length + 1 > PROMPT_MAX) break;
    prompt = next;
    used.push(s);
  }
  if (used.length) prompt += '.';
  return { prompt, words: [...people, ...used] };
}

/** Whisper devuelve a veces el propio prompt (o un trozo) cuando no oye nada claro. */
export function isPromptEcho(raw: string, vocab?: SttVocab | null) {
  if (!vocab?.prompt) return false;
  const text = plain(raw);
  if (!text) return false;
  if (text.length >= 30 && plain(vocab.prompt).includes(text)) return true;
  const pieces = raw.split(/[,.;]/).map(plain).filter(Boolean);
  if (pieces.length < 3) return false;
  const known = new Set(vocab.words.map(plain));
  const hits = pieces.filter(p => known.has(p)).length;
  return hits / pieces.length >= 0.75;
}

/** Un segmento que Whisper casi seguro ha inventado. Umbrales del propio Whisper. */
function junk(s: SttSegment) {
  if ((s.compression_ratio ?? 0) > 2.4) return true;
  return (s.avg_logprob ?? 0) < -1 && (s.no_speech_prob ?? 0) > 0.5;
}

/** Texto de la nube listo para el diálogo, o cadena vacía si no había voz. */
export function cleanHeard(raw: string, segments?: SttSegment[], vocab?: SttVocab | null) {
  const text = raw.trim();
  if (!text) return '';
  const segs = segments ?? [];
  const probs = segs.map(s => s.no_speech_prob ?? 0);
  if (probs.length && Math.min(...probs) > 0.6) return '';
  if (segs.length && segs.every(junk)) return '';
  if (GHOSTS.some(re => re.test(plain(text)))) return '';
  if (isPromptEcho(text, vocab)) return '';
  return text;
}
