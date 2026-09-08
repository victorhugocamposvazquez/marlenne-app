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

/** Texto de la nube listo para el diálogo, o cadena vacía si no había voz. */
export function cleanHeard(raw: string, segments?: { no_speech_prob?: number }[]) {
  const text = raw.trim();
  if (!text) return '';
  const probs = (segments ?? []).map(s => s.no_speech_prob ?? 0);
  if (probs.length && Math.min(...probs) > 0.6) return '';
  const t = fold(text).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (GHOSTS.some(re => re.test(t))) return '';
  return text;
}
