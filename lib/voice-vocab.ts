import { listClientOptions, listProviders, listServices } from '@/lib/queries';

/** Whisper acepta ~224 tokens de prompt. Pasarse no da error: recorta por detrás. */
const MAX_CHARS = 700;

const cache = new Map<string, { at: number; text: string }>();
const TTL = 10 * 60_000;

/** Nombres de servicios, equipo y clientas para que el dictado los oiga bien.
 *  Whisper ignora un prompt que no parece transcripción: va la lista cruda. */
export async function salonVocab(salonId: string) {
  const hit = cache.get(salonId);
  if (hit && Date.now() - hit.at < TTL) return hit.text;

  const [services, team, clients] = await Promise.all([
    listServices(), listProviders(), listClientOptions(),
  ]);
  const words = [
    ...services.map(s => s.name),
    ...team.map(p => p.full_name.split(' ')[0]),
    ...clients.slice(0, 60).map(c => c.full_name.split(' ')[0]),
  ];
  const text = [...new Set(words)].join(', ').slice(0, MAX_CHARS);
  cache.set(salonId, { at: Date.now(), text });
  return text;
}
