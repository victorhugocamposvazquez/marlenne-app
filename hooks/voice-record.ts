import { fallbackToWebSpeech, type VoiceEngine } from '@/hooks/voice-engine';

/** Safari da audio/mp4; Chrome, webm. No forzar ninguno. */
const MIMES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return MIMES.find(m => MediaRecorder.isTypeSupported(m));
}

/** Por debajo de esto es un toque sin querer, no una frase. */
const MIN_MS = 700;
const MAX_MS = 20000;

export function createRecordEngine(): VoiceEngine {
  let stream: MediaStream | null = null;
  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;
  let cut: number | null = null;
  let closed = false;
  let delivered = false;
  let startGate: Promise<void> = Promise.resolve();
  let stopWait: Promise<string> | null = null;

  /** Soltar las pistas cuanto antes: si no, iOS deja la sesión de audio en modo
   *  grabación y la voz de Elvira sale por el auricular, no por el altavoz. */
  const release = () => {
    if (cut) { window.clearTimeout(cut); cut = null; }
    for (const t of stream?.getTracks() ?? []) {
      try { t.stop(); } catch { /* */ }
    }
    stream = null;
    rec = null;
  };

  const engine: VoiceEngine = {
    kind: 'push',

    async start() {
      closed = false;
      delivered = false;
      chunks = [];
      startedAt = Date.now();
      stopWait = null;
      startGate = (async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch (e) {
          const name = e instanceof DOMException ? e.name : '';
          if (name === 'NotAllowedError' || name === 'SecurityError') {
            engine.onDenied?.();
            return;
          }
          engine.onCaptureFail?.('audio-capture');
          return;
        }
        if (closed) {
          release();
          return;
        }
        if (typeof MediaRecorder === 'undefined') {
          release();
          engine.onUnavailable?.();
          return;
        }
        const mimeType = pickMime();
        rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        rec.ondataavailable = ev => { if (ev.data.size) chunks.push(ev.data); };
        rec.start();
        // Tope duro: si alguien se queda con el dedo puesto, no grabamos eternamente.
        cut = window.setTimeout(() => { try { rec?.stop(); } catch { /* */ } }, MAX_MS);
      })();
      await startGate;
    },

    async stop() {
      if (stopWait) return stopWait;
      stopWait = (async () => {
        try { await startGate; } catch { /* start ya avisó */ }
        const r = rec;
        if (!r || closed) {
          const empty = '';
          release();
          finish(empty);
          return empty;
        }
        const ms = Date.now() - startedAt;
        const type = r.mimeType || 'audio/mp4';

        const blob = r.state === 'inactive'
          ? new Blob(chunks, { type })
          : await new Promise<Blob>(resolve => {
            r.onstop = () => resolve(new Blob(chunks, { type }));
            try { r.stop(); } catch { resolve(new Blob(chunks, { type })); }
          });

        // Antes de la red: si no, Elvira suena por el auricular.
        release();
        if (closed || delivered) return '';
        if (ms < MIN_MS || !blob.size) {
          finish('');
          return '';
        }

        const body = new FormData();
        body.append('audio', blob, 'voz.m4a');
        body.append('ms', String(ms));
        const res = await fetch('/api/voice/transcribe', { method: 'POST', body });
        let data: { text?: string; fallback?: boolean } = {};
        try { data = await res.json() as { text?: string; fallback?: boolean }; } catch { /* */ }
        if (res.status === 503 && data.fallback) {
          fallbackToWebSpeech();
          finish('');
          return '';
        }
        if (!res.ok) throw new Error(`stt ${res.status}`);
        const text = (data.text ?? '').trim();
        finish(text);
        return text;
      })();
      try {
        return await stopWait;
      } finally {
        stopWait = null;
      }
    },

    abort() {
      closed = true;
      delivered = true;
      try { rec?.stop(); } catch { /* */ }
      chunks = [];
      release();
    },
  };

  const finish = (text: string) => {
    if (delivered) return;
    delivered = true;
    closed = true;
    engine.onFinal?.(text);
  };

  return engine;
}
