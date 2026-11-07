import { reportVoiceEvent } from '@/lib/voice-events';

export const runtime = 'nodejs';

/** Telemetría de voz. Ruta y no server action: una action delante de la del diálogo la retrasa. */
export async function POST(req: Request) {
  let body: { said?: unknown; outcome?: unknown; detail?: unknown } = {};
  try { body = await req.json() as typeof body; } catch { /* */ }
  const said = typeof body.said === 'string' ? body.said : '';
  const outcome = typeof body.outcome === 'string' ? body.outcome : '';
  if (!said.trim() || !outcome) return new Response(null, { status: 400 });
  const detail = typeof body.detail === 'string' ? body.detail : null;
  // La RPC exige sesión; sin ella falla y reportVoiceEvent se lo traga.
  await reportVoiceEvent(said, outcome, detail);
  return new Response(null, { status: 204 });
}
