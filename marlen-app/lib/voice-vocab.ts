import { listProviders, listServices } from '@/lib/queries';
import { sttPrompt, type SttVocab } from '@/lib/voice-heard';

const cache = new Map<string, { at: number; vocab: SttVocab }>();
const TTL = 10 * 60_000;

/** Servicios y equipo para que el dictado los oiga bien. Sin clientas: inducen nombres. */
export async function salonVocab(salonId: string): Promise<SttVocab> {
  const hit = cache.get(salonId);
  if (hit && Date.now() - hit.at < TTL) return hit.vocab;

  const [services, team] = await Promise.all([listServices(), listProviders()]);
  const vocab = sttPrompt(
    services.map(s => s.name),
    team.map(p => p.full_name.split(' ')[0]),
  );
  cache.set(salonId, { at: Date.now(), vocab });
  return vocab;
}
