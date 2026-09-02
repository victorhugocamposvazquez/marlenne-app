/** Un solo canal de voz: Web Audio. Tras el dictado, Safari silencia speechSynthesis y <audio>. */

const WOMAN_VOICE = /monica|mónica|paulina|helena|elvira|lucia|lucía|marisol|maria|maría|carmen|paloma|laura|silvia|sabina|dalia|soledad|isabela|isabella/i;
const MAN_VOICE = /jorge|juan|diego|pablo|enrique|raul|carlos|thomas/i;

let ctx: AudioContext | null = null;
let src: AudioBufferSourceNode | null = null;
let htmlEl: HTMLAudioElement | null = null;
let playGen = 0;
let womanVoice: SpeechSynthesisVoice | null = null;

function haltHtml() {
  if (!htmlEl) return;
  const el = htmlEl;
  htmlEl = null;
  el.onended = null;
  el.onerror = null;
  try { el.pause(); } catch { /* */ }
  try { el.removeAttribute('src'); el.load(); } catch { /* */ }
}

const bufs = new Map<string, AudioBuffer>();
const loads = new Map<string, Promise<AudioBuffer | null>>();

export function audioCtx() {
  ctx ??= new AudioContext();
  return ctx;
}

export function stopVoicePlay() {
  playGen += 1;
  if (src) {
    try { src.onended = null; src.stop(); } catch { /* */ }
    src = null;
  }
  haltHtml();
}

export function warmVoiceAudio() {
  try { void audioCtx().resume(); } catch { /* */ }
}

export function unlockSpeak() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const warm = new SpeechSynthesisUtterance('.');
  warm.volume = 0;
  warm.rate = 2;
  window.speechSynthesis.speak(warm);
}

export function pickWomanVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return womanVoice;
  const ranked = voices
    .map(v => {
      const n = `${v.name} ${v.voiceURI}`.toLowerCase();
      let s = 0;
      if (v.lang.toLowerCase().startsWith('es')) s += 12;
      if (v.lang.toLowerCase().startsWith('es-es')) s += 6;
      if (/enhanced|premium|neural|wavenet|studio|natural/.test(n)) s += 24;
      if (/compact|eloquence|espeak|robot/.test(n)) s -= 22;
      if (WOMAN_VOICE.test(v.name)) s += 10;
      if (MAN_VOICE.test(v.name)) s -= 18;
      if (v.localService) s += 2;
      return { v, s };
    })
    .sort((a, b) => b.s - a.s);
  womanVoice = ranked[0]?.v ?? null;
  return womanVoice;
}

function remember(key: string, buf: AudioBuffer) {
  bufs.set(key, buf);
  if (bufs.size > 36) {
    const first = bufs.keys().next().value;
    if (first) bufs.delete(first);
  }
}

function loadBuf(key: string, decode: () => Promise<AudioBuffer>) {
  const hit = bufs.get(key);
  if (hit) return Promise.resolve(hit);
  const pending = loads.get(key);
  if (pending) return pending;
  const p = (async () => {
    try {
      const buf = await decode();
      remember(key, buf);
      return buf;
    } catch {
      return null;
    }
  })();
  loads.set(key, p);
  return p;
}

function b64Bytes(b64: string) {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
}

export function decodeB64(key: string, b64: string) {
  return loadBuf(key, async () => audioCtx().decodeAudioData(b64Bytes(b64)));
}

export function decodeUrl(key: string, url: string) {
  return loadBuf(key, async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('clip');
    const ab = await res.arrayBuffer();
    const copy = ab.slice(0);
    const c = audioCtx();
    void c.resume();
    return c.decodeAudioData(copy);
  });
}

/** Si Web Audio no traga el MP3 (Safari + MPEG-2), el elemento audio a veces sí. */
export function playHtmlAudio(url: string) {
  const my = playGen;
  haltHtml();
  return new Promise<boolean>(resolve => {
    try {
      const el = new Audio(url);
      el.preload = 'auto';
      htmlEl = el;
      const end = () => {
        if (htmlEl === el) htmlEl = null;
        el.onended = null;
        el.onerror = null;
        resolve(my === playGen);
      };
      el.onended = end;
      el.onerror = () => {
        if (htmlEl === el) htmlEl = null;
        resolve(false);
      };
      void el.play().then(() => {
        window.setTimeout(end, Math.round((el.duration || 3) * 1000) + 200);
      }).catch(() => {
        if (htmlEl === el) htmlEl = null;
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

export function playBuffer(buf: AudioBuffer, opts?: { rate?: number; gain?: number }) {
  const my = playGen;
  return new Promise<boolean>(resolve => {
    try {
      const c = audioCtx();
      void c.resume();
      haltHtml();
      if (src) {
        try { src.onended = null; src.stop(); } catch { /* */ }
      }
      const node = c.createBufferSource();
      const gain = c.createGain();
      const rate = opts?.rate ?? 1;
      node.buffer = buf;
      node.playbackRate.value = rate;
      gain.gain.value = opts?.gain ?? 1;
      node.connect(gain);
      gain.connect(c.destination);
      src = node;
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        if (src === node) src = null;
        resolve(my === playGen);
      };
      node.onended = end;
      node.start();
      window.setTimeout(end, Math.round((buf.duration / rate) * 1000) + 140);
    } catch {
      resolve(false);
    }
  });
}

export async function playB64(
  key: string,
  b64: string,
  opts?: { rate?: number; gain?: number; mime?: 'audio/mpeg' | 'audio/wav' },
) {
  const buf = await decodeB64(key, b64);
  if (buf) return playBuffer(buf, opts);
  const mime = opts?.mime ?? 'audio/mpeg';
  return playHtmlAudio(`data:${mime};base64,${b64}`);
}

export async function playUrl(key: string, url: string, opts?: { rate?: number; gain?: number }) {
  const buf = await decodeUrl(key, url);
  if (buf) return playBuffer(buf, opts);
  return playHtmlAudio(url);
}

export function speakLocal(text: string, ask: boolean) {
  return new Promise<void>(resolve => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    try { window.speechSynthesis.cancel(); } catch { /* */ }
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickWomanVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'es-ES';
    }
    u.rate = ask ? 0.9 : 0.94;
    u.pitch = ask ? 1.22 : 1.16;
    const t = window.setTimeout(resolve, Math.min(9000, 900 + text.length * 80));
    const end = () => {
      window.clearTimeout(t);
      resolve();
    };
    u.onend = end;
    u.onerror = end;
    // Tras el dictado Safari a veces traga el speak si va en el mismo tick.
    window.setTimeout(() => {
      try { void audioCtx().resume(); } catch { /* */ }
      window.speechSynthesis.speak(u);
    }, 80);
  });
}
