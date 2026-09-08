import { pickHeard, settleMs } from '@/lib/voice-listen';
import { createRecordEngine } from '@/hooks/voice-record';

/** Un motor de oído. 'stream' oye en continuo (iPad); 'push' graba mientras se
 *  mantiene el dedo (iPhone). */
export type VoiceEngineKind = 'stream' | 'push';

type RecAlt = { transcript: string };
type RecResult = ArrayLike<RecAlt> & { isFinal: boolean };
type RecApi = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((ev: { results: ArrayLike<RecResult> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

export function makeWebRec(): RecApi | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (window as unknown as { SpeechRecognition?: new () => RecApi; webkitSpeechRecognition?: new () => RecApi })
    .SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => RecApi }).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'es-ES';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 3;
  return rec;
}

export type VoiceEngine = {
  kind: VoiceEngineKind;
  /** Empieza a oír. En 'push' hay que llamarlo dentro del gesto del usuario. */
  start(): Promise<void>;
  /** Cierra y devuelve lo que se oyó. Cadena vacía si no hubo nada. */
  stop(): Promise<string>;
  /** Corta y tira lo que hubiera. */
  abort(): void;
  /** Dictado parcial, si el motor lo da. 'push' no lo da. */
  onPartial?: (text: string) => void;
  /** Frase cerrada. Un solo camino al diálogo, da igual el motor. */
  onFinal?: (text: string) => void;
  /** Overlay vacío: volver a oír. Solo 'stream'. */
  onRestart?: () => void;
  onDenied?: () => void;
  onCaptureFail?: (err: 'network' | 'audio-capture') => void;
  onUnavailable?: () => void;
  /** Overlay de corrección: no pintar el panel de escucha. */
  overlay?: boolean;
  dialogOpen?: () => boolean;
};

function heardFrom(ev: { results: ArrayLike<RecResult> }) {
  let prefix = '';
  const last = ev.results.length - 1;
  for (let i = 0; i < last; i++) prefix += ev.results[i]?.[0]?.transcript ?? '';
  const tail = ev.results[last];
  const alts: string[] = [];
  const n = tail && typeof tail.length === 'number' ? tail.length : 1;
  for (let j = 0; j < n; j++) {
    const t = `${prefix}${tail?.[j]?.transcript ?? ''}`.trim();
    if (t) alts.push(t);
  }
  return pickHeard(alts.length ? alts : [prefix.trim()]);
}

export function createWebSpeechEngine(kind: VoiceEngineKind = 'stream'): VoiceEngine {
  let rec: RecApi | null = null;
  let settle: number | null = null;
  let heard = '';
  let closed = false;
  let delivered = false;

  const clearSettle = () => {
    if (settle == null) return;
    window.clearTimeout(settle);
    settle = null;
  };

  const dropRec = () => {
    clearSettle();
    const r = rec;
    rec = null;
    if (!r) return;
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    try { r.abort?.(); } catch { /* */ }
    try { r.stop(); } catch { /* ya parado */ }
  };

  const engine: VoiceEngine = {
    kind,

    async start() {
      closed = false;
      delivered = false;
      heard = '';
      dropRec();
      const next = makeWebRec();
      if (!next) {
        engine.onUnavailable?.();
        return;
      }
      rec = next;
      rec.continuous = true;
      rec.onresult = ev => {
        const text = heardFrom(ev);
        if (!text) return;
        heard = text;
        engine.onPartial?.(text);
        clearSettle();
        settle = window.setTimeout(() => finish(heard.trim()), settleMs(text));
      };
      rec.onerror = ev => {
        const err = ev.error ?? '';
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          dropRec();
          engine.onDenied?.();
          return;
        }
        if (err === 'network' || err === 'audio-capture') {
          dropRec();
          engine.onCaptureFail?.(err);
          return;
        }
        finish(heard.trim());
      };
      rec.onend = () => {
        if (closed || rec !== next) return;
        rec = null;
        if (heard.trim()) {
          if (settle == null) {
            settle = window.setTimeout(() => finish(heard.trim()), settleMs(heard));
          }
          return;
        }
        clearSettle();
        if (engine.overlay && engine.dialogOpen?.()) {
          engine.onRestart?.();
          return;
        }
        finish('');
      };
      try {
        rec.start();
      } catch {
        dropRec();
        throw new Error('start');
      }
    },

    async stop() {
      const text = heard.trim();
      finish(text);
      return text;
    },

    abort() {
      closed = true;
      delivered = true;
      heard = '';
      dropRec();
    },
  };

  const finish = (text: string) => {
    if (delivered) return;
    delivered = true;
    closed = true;
    dropRec();
    engine.onFinal?.(text);
  };

  return engine;
}

/** El dictado web se usa si lo fuerzan o si el servidor dijo que no hay STT. */
let webFallback = false;

export function fallbackToWebSpeech() {
  webFallback = true;
}

export function pickEngineKind(): VoiceEngineKind {
  const forced = process.env.NEXT_PUBLIC_VOICE_STT;
  if (forced === 'web') return 'stream';
  if (forced === 'record') return 'push';
  // iPhone nunca arma el wake, haya Groq o no.
  if (typeof navigator !== 'undefined' && /iPhone/i.test(navigator.userAgent)) return 'push';
  return 'stream';
}

export function pickEngine(): VoiceEngine {
  const forced = process.env.NEXT_PUBLIC_VOICE_STT;
  if (forced === 'web') return createWebSpeechEngine();
  const isPhone = typeof navigator !== 'undefined' && /iPhone/i.test(navigator.userAgent);
  if (webFallback) return createWebSpeechEngine(isPhone ? 'push' : 'stream');
  if (forced === 'record') return createRecordEngine();
  return isPhone ? createRecordEngine() : createWebSpeechEngine();
}
