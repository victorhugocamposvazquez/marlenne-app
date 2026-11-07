import { fallbackToWebSpeech, type VoiceEngine } from '@/hooks/voice-engine';

/** Safari da audio/mp4; Chrome, webm. No forzar ninguno. */
const MIMES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return MIMES.find(m => MediaRecorder.isTypeSupported(m));
}

function fileName(type: string) {
  return /webm/.test(type) ? 'voz.webm' : 'voz.m4a';
}

/** Por debajo de esto es un toque sin querer, no una frase. */
const MIN_MS = 700;
const MAX_MS = 20000;
/** Se suelta el dedo con la última sílaba aún en el aire. */
const POST_ROLL_MS = 350;
const STT_TIMEOUT_MS = 10000;

export class SttTimeout extends Error {
  constructor() { super('stt timeout'); }
}

export function createRecordEngine(): VoiceEngine {
  let stream: MediaStream | null = null;
  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let pressedAt = 0;
  let readyAt = 0;
  let cut: number | null = null;
  let closed = false;
  let delivered = false;
  let startGate: Promise<void> = Promise.resolve();
  let stopWait: Promise<string> | null = null;
  let inflight: AbortController | null = null;

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
      pressedAt = Date.now();
      readyAt = 0;
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
        const next = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        rec = next;
        next.ondataavailable = ev => { if (ev.data.size) chunks.push(ev.data); };
        const ready = () => {
          if (rec !== next || closed || readyAt) return;
          readyAt = Date.now();
          engine.onReady?.();
        };
        next.onstart = ready;
        next.start();
        // Algún Safari no emite «start»: no dejar el botón en «Espera» para siempre.
        window.setTimeout(ready, 1200);
        // Tope duro: si alguien se queda con el dedo puesto, no grabamos eternamente.
        cut = window.setTimeout(() => { try { rec?.stop(); } catch { /* */ } }, MAX_MS);
      })();
      await startGate;
    },

    async stop() {
      if (stopWait) return stopWait;
      stopWait = (async () => {
        try { await startGate; } catch { /* start ya avisó */ }
        if (rec && !closed && rec.state === 'recording') {
          await new Promise(r => window.setTimeout(r, POST_ROLL_MS));
        }
        const r = rec;
        if (!r || closed) {
          const empty = '';
          release();
          finish(empty);
          return empty;
        }
        const from = readyAt || pressedAt;
        const ms = Date.now() - from;
        const lag = readyAt ? readyAt - pressedAt : -1;
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
        body.append('audio', blob, fileName(type));
        body.append('ms', String(ms));
        body.append('lag', String(lag));
        const ctl = new AbortController();
        inflight = ctl;
        const timer = window.setTimeout(() => ctl.abort(), STT_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch('/api/voice/transcribe', { method: 'POST', body, signal: ctl.signal });
        } catch (e) {
          if (closed || delivered) return '';
          if (ctl.signal.aborted) throw new SttTimeout();
          throw e;
        } finally {
          window.clearTimeout(timer);
          if (inflight === ctl) inflight = null;
        }
        let data: { text?: string; fallback?: boolean } = {};
        try { data = await res.json() as { text?: string; fallback?: boolean }; } catch { /* */ }
        if (closed || delivered) return '';
        if (res.status === 503 && data.fallback) {
          fallbackToWebSpeech();
          finish('');
          return '';
        }
        if (res.status === 504) throw new SttTimeout();
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
      inflight?.abort();
      inflight = null;
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
