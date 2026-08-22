'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Mic, Square, X } from 'lucide-react';
import {
  voiceAddWait, voiceApplyCancel, voiceApplyMove, voiceApplyStatus, voiceConfirmBook,
  voiceMatchClient, voicePreviewBook, voicePreviewCancel, voicePreviewMove, voicePreviewStatus,
  voiceSlots, voiceToday,
  type PendingBook,
} from '@/app/actions/voice';
import type { VoiceTalkResult } from '@/app/actions/voice-talk';
import { voiceSpeakMp3 } from '@/app/actions/voice-speak';
import { DIME_WAV_B64 } from '@/lib/dime-wav';
import { VOICE_HELP, fold, forEar, isVoiceYes, parseVoice, pickSpokenIndex, splitWake, takeTime, wakeRestIsCommand } from '@/lib/voice';
import { VOICE_PREFS_EVENT, getVoicePrefs, setVoicePrefs, wakeWanted, type VoicePrefs } from '@/lib/voice-prefs';

type Choice = { id: string; label: string };
type Panel =
  | { mode: 'idle' }
  | { mode: 'listen'; draft: string }
  | { mode: 'msg'; say: string }
  | { mode: 'ask'; say: string; options?: string[]; href?: string }
  | { mode: 'confirm'; say: string; status?: 'curso' | 'noshow'; pick?: 'status' | 'cancel'; run: () => Promise<{ ok: boolean; say: string; href?: string }>; choices?: Choice[] };

const WOMAN_VOICE = /monica|mónica|paulina|helena|elvira|lucia|lucía|marisol|maria|maría|carmen|paloma|laura|silvia|sabina|dalia|soledad|isabela|isabella/i;
const MAN_VOICE = /jorge|juan|diego|pablo|enrique|raul|carlos|thomas|jorge/i;

let womanVoiceCache: SpeechSynthesisVoice | null = null;

function pickWomanVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return womanVoiceCache;
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
  womanVoiceCache = ranked[0]?.v ?? null;
  return womanVoiceCache;
}

let speakTimer = 0;

function unlockSpeak() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const warm = new SpeechSynthesisUtterance('.');
  warm.volume = 0;
  warm.rate = 2;
  window.speechSynthesis.speak(warm);
}

let beepCtx: AudioContext | null = null;
let dimeBuf: AudioBuffer | null = null;
let dimeLoad: Promise<AudioBuffer | null> | null = null;

function audioCtx() {
  beepCtx ??= new AudioContext();
  return beepCtx;
}

function loadDime() {
  if (dimeBuf) return Promise.resolve(dimeBuf);
  dimeLoad ??= (async () => {
    try {
      const ctx = audioCtx();
      const bin = Uint8Array.from(atob(DIME_WAV_B64), c => c.charCodeAt(0));
      dimeBuf = await ctx.decodeAudioData(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
      return dimeBuf;
    } catch {
      return null;
    }
  })();
  return dimeLoad;
}

function chime() {
  try {
    const ctx = audioCtx();
    void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1175, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch { /* */ }
}

function warmAudio() {
  try {
    void audioCtx().resume();
    void loadDime();
  } catch { /* */ }
  unlockSpeak();
}

/** «Dime» por el mismo audio que el pitido: Safari no bloquea este canal. */
function sayDime(onDone: () => void) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onDone();
  };

  const start = (buf: AudioBuffer) => {
    try {
      const ctx = audioCtx();
      void ctx.resume();
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      gain.gain.value = 1;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.onended = () => finish();
      src.start();
      window.setTimeout(finish, Math.round(buf.duration * 1000) + 100);
    } catch {
      speakDimeNow(finish);
    }
  };

  if (dimeBuf) {
    start(dimeBuf);
    return;
  }
  void loadDime().then(buf => {
    if (buf) start(buf);
    else speakDimeNow(finish);
  });
}

function speakDimeNow(onDone: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onDone();
    return;
  }
  try { window.speechSynthesis.cancel(); } catch { /* */ }
  const u = new SpeechSynthesisUtterance('Dime.');
  const voice = pickWomanVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = 'es-ES';
  }
  u.rate = 0.95;
  u.pitch = 1;
  u.volume = 1;
  u.onend = onDone;
  u.onerror = onDone;
  window.speechSynthesis.speak(u);
}

const ttsCache = new Map<string, string>();
let ttsCloud: boolean | null = null;
let ttsAudio: HTMLAudioElement | null = null;
let speakGen = 0;

function stopSpeak() {
  speakGen += 1;
  window.clearTimeout(speakTimer);
  try { window.speechSynthesis?.cancel(); } catch { /* */ }
  if (ttsAudio) {
    ttsAudio.onended = null;
    ttsAudio.onerror = null;
    ttsAudio.pause();
  }
}

function speakLocal(text: string, ask: boolean, onDone: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onDone();
    return;
  }
  const parts = text.split(/(?<=[.?!,])\s+/).map(s => s.trim()).filter(Boolean);
  const chunks = parts.length ? parts : [text];
  let i = 0;
  const next = () => {
    if (i >= chunks.length) {
      onDone();
      return;
    }
    const part = chunks[i++];
    const last = i >= chunks.length;
    const q = ask && (part.includes('?') || last);
    const u = new SpeechSynthesisUtterance(part);
    const voice = pickWomanVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'es-ES';
    }
    u.rate = q ? 0.86 : 0.9;
    u.pitch = q ? 1.14 : 1.04;
    u.onend = () => { speakTimer = window.setTimeout(next, q ? 60 : 120); };
    u.onerror = onDone;
    window.speechSynthesis.speak(u);
  };
  speakTimer = window.setTimeout(() => {
    try { window.speechSynthesis.cancel(); } catch { /* */ }
    next();
  }, 80);
}

async function cloudMp3Url(text: string, kind: 'ask' | 'say') {
  const key = `${kind}:${text}`;
  const hit = ttsCache.get(key);
  if (hit) return hit;
  const b64 = await voiceSpeakMp3(text, kind);
  if (!b64) {
    ttsCloud = false;
    return null;
  }
  ttsCloud = true;
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bin], { type: 'audio/mpeg' }));
  ttsCache.set(key, url);
  if (ttsCache.size > 40) {
    const first = ttsCache.keys().next().value;
    if (first) {
      const old = ttsCache.get(first);
      if (old) URL.revokeObjectURL(old);
      ttsCache.delete(first);
    }
  }
  return url;
}

/** Misma vía que el pitido: Safari no corta este canal tras el dictado. */
async function playCloud(text: string, kind: 'ask' | 'say') {
  const url = await cloudMp3Url(text, kind);
  if (!url) return false;
  try {
    const ctx = audioCtx();
    await ctx.resume();
    const raw = await (await fetch(url)).arrayBuffer();
    const buf = await ctx.decodeAudioData(raw.slice(0));
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(ctx.destination);
    await new Promise<void>(resolve => {
      let done = false;
      const end = () => { if (done) return; done = true; resolve(); };
      src.onended = end;
      src.start();
      window.setTimeout(end, Math.round(buf.duration * 1000) + 80);
    });
    return true;
  } catch {
    return new Promise<boolean>(resolve => {
      ttsAudio ??= new Audio();
      const el = ttsAudio;
      el.onended = () => resolve(true);
      el.onerror = () => resolve(false);
      el.src = url;
      el.volume = 1;
      void el.play().catch(() => resolve(false));
    });
  }
}

function speak(text: string, onDone?: () => void) {
  if (typeof window === 'undefined' || !getVoicePrefs().speak) {
    onDone?.();
    return;
  }
  stopSpeak();
  const gen = speakGen;
  const ear = forEar(text);
  const ask = /\?/.test(text);
  let done = false;
  const finish = () => {
    if (done || gen !== speakGen) return;
    done = true;
    onDone?.();
  };

  void (async () => {
    if (ttsCloud !== false) {
      const ok = await playCloud(ear, ask ? 'ask' : 'say');
      if (gen !== speakGen) return;
      if (ok) {
        finish();
        return;
      }
    }
    speakLocal(ear, ask, finish);
    if (onDone) window.setTimeout(finish, Math.min(9000, 900 + ear.length * 70));
  })();
}

type RecApi = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function makeRec(): RecApi | null {
  const Ctor = (window as unknown as { SpeechRecognition?: new () => RecApi; webkitSpeechRecognition?: new () => RecApi })
    .SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => RecApi }).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'es-ES';
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

export default function VoiceFab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [panel, setPanel] = useState<Panel>({ mode: 'idle' });
  const [pending, startTransition] = useTransition();
  const recRef = useRef<RecApi | null>(null);
  const pendingRef = useRef<PendingBook | null>(null);
  const confirmRef = useRef<Extract<Panel, { mode: 'confirm' }> | null>(null);
  const genRef = useRef(0);
  const listenRef = useRef(false);
  const overlayRef = useRef(false);
  const draftRef = useRef('');
  const optionsRef = useRef<string[]>([]);
  const commitRef = useRef<() => void>(() => {});
  const [hearDraft, setHearDraft] = useState('');
  const [hearing, setHearing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);
  const [wakeHeard, setWakeHeard] = useState('');
  const armedRef = useRef(false);
  const hushRef = useRef(false);
  const busyRef = useRef(false);
  const prefsRef = useRef<VoicePrefs>(getVoicePrefs());
  const wakeRef = useRef(false);
  const startWakeRef = useRef<() => void>(() => {});
  const ignoreOutsideRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasMic, setHasMic] = useState(false);

  const syncPrefs = (p = getVoicePrefs()) => {
    prefsRef.current = p;
    hushRef.current = !wakeWanted(p);
    if (hushRef.current) {
      armedRef.current = false;
      setArmed(false);
      setWakeOn(false);
      wakeRef.current = false;
    }
  };

  const arm = () => {
    if (!wakeWanted(prefsRef.current)) return;
    hushRef.current = false;
    armedRef.current = true;
    setArmed(true);
  };

  const hush = () => {
    setVoicePrefs({ hola: false });
    hushRef.current = true;
    armedRef.current = false;
    setArmed(false);
    setWakeOn(false);
    wakeRef.current = false;
    genRef.current += 1;
    killRec();
  };

  confirmRef.current = panel.mode === 'confirm' ? panel : null;

  const killRec = () => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try { rec.abort?.(); } catch { /* */ }
    try { rec.stop(); } catch { /* ya parado */ }
  };

  const dismiss = () => {
    genRef.current += 1;
    listenRef.current = false;
    overlayRef.current = false;
    draftRef.current = '';
    setHearing(false);
    setHearDraft('');
    killRec();
    stopSpeak();
    pendingRef.current = null;
    setTyped('');
    setPanel({ mode: 'idle' });
    setOpen(false);
    window.setTimeout(() => startWakeRef.current(), 400);
  };

  const restIdle = (say?: string) => {
    genRef.current += 1;
    listenRef.current = false;
    overlayRef.current = false;
    draftRef.current = '';
    setHearing(false);
    setHearDraft('');
    killRec();
    setOpen(true);
    setPanel(say ? { mode: 'msg', say } : { mode: 'idle' });
  };

  useEffect(() => {
    setHasMic(!!makeRec());
    pickWomanVoice();
    const onVoices = () => pickWomanVoice();
    window.speechSynthesis?.addEventListener('voiceschanged', onVoices);
    syncPrefs();
    void loadDime();
    const onFirst = () => warmAudio();
    window.addEventListener('pointerdown', onFirst, { once: true });
    window.addEventListener('touchstart', onFirst, { once: true });
    if (wakeWanted(prefsRef.current)) {
      arm();
      window.setTimeout(() => startWakeRef.current(), 400);
    }
    const onPrefs = () => {
      syncPrefs();
      if (wakeWanted(prefsRef.current)) {
        arm();
        startWakeRef.current();
      } else {
        genRef.current += 1;
        killRec();
        wakeRef.current = false;
        setWakeOn(false);
      }
    };
    window.addEventListener(VOICE_PREFS_EVENT, onPrefs);
    const onVis = () => {
      if (document.hidden) {
        if (wakeRef.current) {
          genRef.current += 1;
          wakeRef.current = false;
          setWakeOn(false);
          killRec();
        }
        return;
      }
      if (!hushRef.current) window.setTimeout(() => startWakeRef.current(), 600);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', onVoices);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(VOICE_PREFS_EVENT, onPrefs);
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('touchstart', onFirst);
    };
  }, []);

  useEffect(() => {
    if (!wakeHeard) return;
    const t = window.setTimeout(() => setWakeHeard(''), 4000);
    return () => window.clearTimeout(t);
  }, [wakeHeard]);

  useEffect(() => {
    const sheet = ['new', 'appt', 'alta', 'editar', 'close', 'block', 'bloqueo']
      .some(k => searchParams.get(k));
    const check = () => {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      const field = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el?.isContentEditable;
      busyRef.current = field || sheet;
      if (busyRef.current) {
        if (wakeRef.current) {
          genRef.current += 1;
          wakeRef.current = false;
          setWakeOn(false);
          killRec();
        }
        return;
      }
      startWakeRef.current();
    };
    check();
    document.addEventListener('focusin', check);
    const onOut = () => window.setTimeout(check, 160);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', onOut);
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!open) return;
    if (panel.mode === 'listen') {
      const t = window.setTimeout(() => commitRef.current(), 12000);
      return () => window.clearTimeout(t);
    }
    if (panel.mode === 'idle' && typed.trim()) return;
    const ms = panel.mode === 'idle' || panel.mode === 'msg' ? 8000
      : panel.mode === 'ask' ? 20000
      : 0;
    if (!ms) return;
    const t = window.setTimeout(dismiss, ms);
    return () => window.clearTimeout(t);
  }, [open, panel.mode, typed]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (listenRef.current) return;
      if (Date.now() < ignoreOutsideRef.current) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) dismiss();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const finish = (say: string, href?: string) => {
    const gen = ++genRef.current;
    killRec();
    speak(say);
    setPanel({ mode: 'msg', say });
    if (href) router.push(href);
    window.setTimeout(() => {
      if (gen !== genRef.current) return;
      setPanel({ mode: 'idle' });
      setOpen(false);
      startWakeRef.current();
    }, 2800);
  };

  const applyTalk = (r: VoiceTalkResult) => {
    if (r.matches && r.matches.length > 1) {
      setPanel({
        mode: 'confirm',
        say: r.say,
        status: r.status,
        choices: r.matches,
        pick: r.cancel ? 'cancel' : 'status',
        run: async () => ({ ok: false, say: 'Elige una' }),
      });
      speak(r.say, () => startListen({ overlay: true }));
      return;
    }
    if (r.ready && r.draft && r.move) {
      pendingRef.current = null;
      const draft = r.draft as { id: string; date: string; startMin: number; providerId: string };
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyMove(draft) });
      speak(r.say, () => startListen({ overlay: true }));
      return;
    }
    if (r.ready && r.draft && !r.move && !r.draft.who) {
      pendingRef.current = null;
      const draft = r.draft as Parameters<typeof voiceConfirmBook>[0];
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceConfirmBook(draft) });
      speak(r.say, () => startListen({ overlay: true }));
      return;
    }
    if (r.draft && typeof r.draft.who === 'string') {
      const who = r.draft.who;
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceAddWait(who) });
      speak(r.say, () => startListen({ overlay: true }));
      return;
    }
    if (r.matches?.length === 1 && r.cancel) {
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyCancel(r.matches![0].id) });
      speak(r.say, () => startListen({ overlay: true }));
      return;
    }
    if (r.matches?.length === 1 && r.status) {
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyStatus(r.matches![0].id, r.status!) });
      speak(r.say, () => startListen({ overlay: true }));
      return;
    }
    if ((r.need === 'service' || r.need === 'time') && r.pending) {
      pendingRef.current = r.pending;
      optionsRef.current = r.options ?? r.pending.slotMins?.map(m => {
        const h = Math.floor(m / 60);
        return `${h}:${String(m % 60).padStart(2, '0')}`;
      }) ?? [];
      setPanel({ mode: 'ask', say: r.say, options: r.options, href: r.href });
      speak(r.say, () => startListen({ overlay: true }));
      return;
    }
    pendingRef.current = null;
    finish(r.say, r.href);
  };

  const continueBook = async (patch: Partial<PendingBook>) => {
    const p = { ...pendingRef.current!, ...patch };
    const preview = await voicePreviewBook(
      p.who, p.startMin, p.serviceQ, p.dayOffset, p.providerQ, pendingRef.current?.choices ?? null,
    );
    applyTalk(preview);
  };

  const runText = (text: string) => {
    const said = fold(text);
    const confirming = confirmRef.current;
    if (confirming && isVoiceYes(said)) {
      startTransition(async () => {
        const r = await confirming.run();
        finish(r.say, r.href);
      });
      return;
    }
    if (confirming && (/^(no|ahora no|mejor no|cancelar?)\b/.test(said) || parseVoice(text).kind === 'dismiss')) {
      dismiss();
      return;
    }

    startTransition(async () => {
      const cmd = parseVoice(text);
      if (cmd.kind === 'dismiss') {
        dismiss();
        return;
      }

      const held = pendingRef.current;
      const abortHeld = cmd.kind === 'today' || cmd.kind === 'cancel' || cmd.kind === 'go'
        || cmd.kind === 'slots' || cmd.kind === 'status' || cmd.kind === 'wait' || cmd.kind === 'move';
      if (held && !abortHeld) {
        const pick = pickSpokenIndex(text, optionsRef.current.length);
        if (pick != null) {
          if (held.need === 'time' && held.slotMins?.[pick] != null) {
            await continueBook({ startMin: held.slotMins[pick] });
            return;
          }
          await continueBook({ serviceQ: optionsRef.current[pick] });
          return;
        }
        if (held.need === 'time') {
          const clock = takeTime(text).startMin ?? (cmd.kind === 'book' ? cmd.startMin : null);
          if (clock !== null) {
            await continueBook({ startMin: clock });
            return;
          }
          if (held.serviceQ && /hora|cavit|media|corta|larga/.test(said)) {
            await continueBook({ serviceQ: `${held.serviceQ} ${text}`, startMin: held.startMin });
            return;
          }
          await continueBook({ startMin: null, serviceQ: held.serviceQ });
          return;
        }
        const serviceQ = cmd.kind === 'book' && cmd.serviceQ
          ? cmd.serviceQ
          : text.trim().replace(/^(pues |mira |vale |una |un |de |el |la |le hacemos |hacemos |quiero |ponle )/i, '').trim();
        await continueBook({ serviceQ });
        return;
      }
      if (held) pendingRef.current = null;

      if (cmd.kind === 'unknown') {
        const named = await voiceMatchClient(cmd.text);
        if (named) {
          applyTalk(await voicePreviewBook(cmd.text, null, null, 0, null));
          return;
        }
        const say = `No he pillado «${cmd.text}». Dime el servicio, la hora, o una cita.`;
        speak(say, () => startListen());
        setPanel({ mode: 'msg', say });
        return;
      }
      if (cmd.kind === 'help') {
        const say = `Puedo: ${VOICE_HELP}`;
        speak(say, () => startListen());
        setPanel({ mode: 'msg', say });
        return;
      }
      if (cmd.kind === 'go') {
        finish(cmd.say, cmd.href);
        return;
      }
      if (cmd.kind === 'search') {
        finish(`Busco ${cmd.q}`, `/clientas?q=${encodeURIComponent(cmd.q)}`);
        return;
      }
      if (cmd.kind === 'today') {
        const r = await voiceToday();
        finish(r.say, r.href);
        return;
      }
      if (cmd.kind === 'wait') {
        if (!cmd.who) {
          finish('Lista de espera', '/agenda?wait=1');
          return;
        }
        const who = cmd.who;
        setPanel({
          mode: 'confirm',
          say: `¿Apunto a ${who} en espera?`,
          run: () => voiceAddWait(who),
        });
        speak(`¿Apunto a ${who} en espera?`, () => startListen({ overlay: true }));
        return;
      }
      if (cmd.kind === 'status') {
        const preview = await voicePreviewStatus(cmd.who, cmd.status);
        if (!preview.ok || preview.matches.length === 0) {
          finish(preview.say);
          return;
        }
        if (preview.matches.length === 1) {
          const id = preview.matches[0].id;
          setPanel({
            mode: 'confirm',
            say: preview.say,
            run: () => voiceApplyStatus(id, cmd.status),
          });
          speak(preview.say, () => startListen({ overlay: true }));
          return;
        }
        setPanel({
          mode: 'confirm',
          say: preview.say,
          status: cmd.status,
          pick: 'status',
          choices: preview.matches,
          run: async () => ({ ok: false, say: 'Elige una' }),
        });
        speak(preview.say, () => startListen({ overlay: true }));
        return;
      }
      if (cmd.kind === 'slots') {
        const r = await voiceSlots(cmd.dayOffset, cmd.startMin, cmd.providerQ);
        finish(r.say, r.href);
        return;
      }
      if (cmd.kind === 'book') {
        applyTalk(await voicePreviewBook(cmd.who, cmd.startMin, cmd.serviceQ, cmd.dayOffset, cmd.providerQ));
        return;
      }
      if (cmd.kind === 'cancel') {
        const preview = await voicePreviewCancel(cmd.who, cmd.dayOffset);
        if (!preview.ok || preview.matches.length === 0) {
          finish(preview.say);
          return;
        }
        if (preview.matches.length === 1) {
          const id = preview.matches[0].id;
          setPanel({ mode: 'confirm', say: preview.say, run: () => voiceApplyCancel(id) });
          speak(preview.say, () => startListen({ overlay: true }));
          return;
        }
        setPanel({
          mode: 'confirm',
          say: preview.say,
          pick: 'cancel',
          choices: preview.matches,
          run: async () => ({ ok: false, say: 'Elige una' }),
        });
        speak(preview.say, () => startListen({ overlay: true }));
        return;
      }
      if (cmd.kind === 'move') {
        const preview = await voicePreviewMove(cmd.who, cmd.startMin, cmd.dayOffset, cmd.providerQ);
        if (!preview.ok || !preview.draft) {
          finish(preview.say, preview.href);
          return;
        }
        const draft = preview.draft;
        setPanel({ mode: 'confirm', say: preview.say, run: () => voiceApplyMove(draft) });
        speak(preview.say, () => startListen({ overlay: true }));
      }
    });
  };

  const commitListen = () => {
    if (!listenRef.current) return;
    const text = draftRef.current.trim() || typed.trim();
    const overlay = overlayRef.current;
    listenRef.current = false;
    overlayRef.current = false;
    genRef.current += 1;
    killRec();
    setHearing(false);
    setHearDraft('');
    if (text) {
      setTyped('');
      draftRef.current = '';
      const wake = splitWake(text);
      if (wake.woke && !wakeRestIsCommand(wake.rest)) {
        promptDimeThenListen(overlay ? { overlay: true } : undefined);
        return;
      }
      runText(wake.woke ? wake.rest : text);
      return;
    }
    if (overlay) {
      setOpen(true);
      return;
    }
    setOpen(true);
    setPanel({ mode: 'idle' });
  };
  commitRef.current = commitListen;

  const startWake = () => {
    if (!wakeWanted(prefsRef.current) || hushRef.current || busyRef.current || document.hidden) return;
    if (listenRef.current || overlayRef.current) return;
    if (wakeRef.current && recRef.current) return;
    if (!makeRec()) return;
    arm();
    const gen = ++genRef.current;
    killRec();
    const rec = makeRec();
    if (!rec) return;
    rec.interimResults = false;
    recRef.current = rec;
    wakeRef.current = true;
    setWakeOn(true);
    rec.onresult = ev => {
      if (gen !== genRef.current) return;
      let text = '';
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i]?.[0]?.transcript ?? '';
      }
      const heard = text.trim();
      if (!heard) return;
      const last = ev.results[ev.results.length - 1];
      const wake = splitWake(heard);
      const cmd = parseVoice(heard);
      const isCmd = cmd.kind !== 'unknown' && cmd.kind !== 'help' && cmd.kind !== 'dismiss';
      if (!wake.woke && !isCmd) {
        if (last?.isFinal) setWakeHeard(heard);
        return;
      }
      wakeRef.current = false;
      setWakeOn(false);
      genRef.current += 1;
      killRec();
      if (isCmd && !wake.woke) {
        setOpen(true);
        runText(heard);
        return;
      }
      if (wakeRestIsCommand(wake.rest)) {
        setOpen(true);
        setPanel({ mode: 'listen', draft: wake.rest });
        runText(wake.rest);
        return;
      }
      promptDimeThenListen();
    };
    rec.onerror = ev => {
      if (gen !== genRef.current) return;
      wakeRef.current = false;
      setWakeOn(false);
      if (ev.error === 'not-allowed') {
        armedRef.current = false;
        setArmed(false);
        return;
      }
      if (ev.error === 'no-speech') {
        window.setTimeout(() => startWakeRef.current(), 2500);
        return;
      }
      window.setTimeout(() => startWakeRef.current(), 1800);
    };
    rec.onend = () => {
      if (gen !== genRef.current) return;
      wakeRef.current = false;
      setWakeOn(false);
      if (!wakeWanted(prefsRef.current) || busyRef.current || listenRef.current || document.hidden || hushRef.current) return;
      window.setTimeout(() => startWakeRef.current(), 2200);
    };
    try {
      rec.start();
    } catch {
      wakeRef.current = false;
      setWakeOn(false);
    }
  };
  startWakeRef.current = startWake;

  const startListen = (opts?: { overlay?: boolean }) => {
    if (!prefsRef.current.micOnly) hushRef.current = false;
    arm();
    wakeRef.current = false;
    setWakeOn(false);
    const gen = ++genRef.current;
    draftRef.current = '';
    listenRef.current = true;
    overlayRef.current = !!opts?.overlay;
    setHearing(true);
    setHearDraft('');
    killRec();
    const rec = makeRec();
    if (!rec) {
      setOpen(true);
      if (!opts?.overlay) setPanel({ mode: 'msg', say: 'Este Safari no dicta. Escribe el comando abajo.' });
      return;
    }
    recRef.current = rec;
    ignoreOutsideRef.current = Date.now() + 2000;
    setOpen(true);
    if (!opts?.overlay) setPanel({ mode: 'listen', draft: '' });
    rec.onresult = ev => {
      if (gen !== genRef.current) return;
      let text = '';
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i]?.[0]?.transcript ?? '';
      }
      draftRef.current = text.trim();
      if (overlayRef.current) setHearDraft(draftRef.current);
      else setPanel({ mode: 'listen', draft: draftRef.current });
      if (ev.results[ev.results.length - 1]?.isFinal && draftRef.current) {
        commitListen();
      }
    };
    rec.onerror = ev => {
      if (gen !== genRef.current) return;
      if (ev.error === 'not-allowed') {
        if (overlayRef.current) {
          listenRef.current = false;
          overlayRef.current = false;
          killRec();
          return;
        }
        restIdle('Sin permiso de micro. Puedes escribir el comando.');
        return;
      }
      commitListen();
    };
    rec.onend = () => {
      if (gen !== genRef.current) return;
      window.setTimeout(commitListen, 0);
    };
    try {
      rec.start();
    } catch {
      if (opts?.overlay) {
        listenRef.current = false;
        overlayRef.current = false;
        return;
      }
      restIdle('No he podido oír. Toca el micro otra vez.');
    }
  };

  const promptDimeThenListen = (opts?: { overlay?: boolean }) => {
    setOpen(true);
    if (!opts?.overlay) setPanel({ mode: 'listen', draft: '' });
    chime();
    window.setTimeout(() => sayDime(() => startListen(opts)), 240);
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end px-3"
    >
      {open && (
        <div className="pointer-events-auto mb-2 w-full max-w-[360px] rounded-[18px] border border-surface-line bg-white p-3 shadow-toast">
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Cerrar"
              className="grid h-8 w-8 place-items-center rounded-[10px] text-ink-3"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>
          {panel.mode === 'listen' && (
            <p className="text-[13px] font-semibold text-ink-2">
              {panel.draft || 'Dime.'}
            </p>
          )}
          {panel.mode === 'msg' && (
            <p className="text-[13px] font-semibold text-ink-2">{panel.say}</p>
          )}
          {panel.mode === 'ask' && (
            <div>
              <p className="text-[13px] font-semibold text-ink-2">{panel.say}</p>
              <p className="mt-1 text-[12px] font-semibold text-v-d">
                {hearDraft || (hearing
                  ? (pendingRef.current?.need === 'time' ? 'Dilo: once y media, o toca una hora.' : 'Dilo: vacumterapia, facial…')
                  : 'Toca el micro y dilo, o elige abajo.')}
              </p>
              {panel.options && panel.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {panel.options.map(opt => (
                    <button
                      key={opt}
                      disabled={pending}
                      onClick={() => {
                        unlockSpeak();
                        startTransition(async () => {
                          const held = pendingRef.current;
                          if (held?.need === 'time') {
                            const clock = takeTime(opt).startMin
                              ?? held.slotMins?.[panel.options?.indexOf(opt) ?? -1];
                            if (clock != null) {
                              await continueBook({ startMin: clock });
                              return;
                            }
                          }
                          await continueBook({ serviceQ: opt });
                        });
                      }}
                      className="rounded-[10px] bg-v-soft px-2.5 py-1.5 text-[11.5px] font-bold text-v-d"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {panel.href && (
                <button
                  type="button"
                  onClick={() => { pendingRef.current = null; finish('Abro el alta.', panel.href); }}
                  className="mt-2 text-[11.5px] font-bold text-ink-3"
                >
                  Abrir el alta a mano
                </button>
              )}
            </div>
          )}
          {panel.mode === 'confirm' && (
            <div>
              <p className="text-[13px] font-semibold text-ink-2">{panel.say}</p>
              <p className="mt-1 text-[12px] font-semibold text-v-d">
                {hearDraft || (hearing ? 'Di sí o no.' : 'Di sí, o toca Sí.')}
              </p>
              {panel.choices && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {panel.choices.map(c => (
                    <button
                      key={c.id}
                      disabled={pending}
                      onClick={() => startTransition(async () => {
                        const r = panel.pick === 'cancel'
                          ? await voiceApplyCancel(c.id)
                          : await voiceApplyStatus(c.id, panel.status ?? 'noshow');
                        finish(r.say, r.href);
                      })}
                      className="rounded-[12px] border border-surface-line bg-v-tint px-3 py-2 text-left text-[12.5px] font-bold text-v-d"
                    >
                      {c.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-[12px] border border-surface-line py-2 text-[12.5px] font-bold text-ink-2"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {!panel.choices && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="flex-1 rounded-[12px] border border-surface-line py-2 text-[12.5px] font-bold text-ink-2"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      const r = await panel.run();
                      finish(r.say, r.href);
                    })}
                    className="flex-1 rounded-[12px] bg-grad py-2 text-[12.5px] font-extrabold text-white disabled:opacity-40"
                  >
                    Sí
                  </button>
                </div>
              )}
            </div>
          )}
          {panel.mode === 'idle' && (
            <div className="text-[12.5px] font-medium leading-snug text-ink-2">
              <p className="font-bold text-ink">Así se usa</p>
              <p className="mt-1">1. Pitido + «Dime», o toca el micro. En Más se apaga el oído.</p>
              <p>2. Si va a guardar, te pide confirmación.</p>
              <p className="mt-2 text-[12px] text-ink-3">
                Ej.: quién tiene hueco el miércoles a las 11:30 · cita para Lucía con Valeria a las 11:30
              </p>
            </div>
          )}
          <form
            className="mt-2 flex gap-2"
            onSubmit={e => {
              e.preventDefault();
              const q = typed.trim();
              if (!q) return;
              setTyped('');
              runText(q);
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-[12px] border border-surface-line px-3 py-2 text-[13px] font-semibold"
              placeholder="Escribe o dicta el comando"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              aria-label="Comando"
            />
            <button className="rounded-[12px] bg-v-soft px-3 py-2 text-[12px] font-bold text-v-d">Ir</button>
          </form>
        </div>
      )}
      <div className="relative">
        <button
          type="button"
          aria-label={hearing ? 'Dejar de escuchar' : 'Hablar con Marlenne'}
          aria-pressed={hearing}
          onClick={() => {
            warmAudio();
            if (hearing) commitListen();
            else if (!open) startListen();
            else if (panel.mode === 'ask' || panel.mode === 'confirm') startListen({ overlay: true });
            else startListen();
          }}
          className={`pointer-events-auto grid h-14 w-14 place-items-center rounded-[18px] text-white shadow-btn ${
            hearing ? 'bg-pink-600' : 'bg-grad'
          }`}
        >
          {hearing ? <Square size={20} strokeWidth={2.4} /> : <Mic size={22} strokeWidth={2.2} />}
        </button>
        {armed && !hearing && !open && (
          <button
            type="button"
            title={wakeOn ? 'Oído en espera. Toca para callar.' : 'Oído en pausa. Toca el micro para hablar.'}
            aria-label="Callar oído de Hola Marlenne"
            onClick={e => { e.stopPropagation(); hush(); }}
            className="pointer-events-auto absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-white/80 shadow"
          />
        )}
      </div>
      {!open && wakeHeard && (
        <p className="pointer-events-none mt-1 max-w-[200px] text-right text-[10px] font-semibold text-ink-3">
          Oí «{wakeHeard}»
        </p>
      )}
      {!hasMic && open && (
        <p className="pointer-events-none mt-1 text-right text-[10.5px] font-semibold text-ink-3">
          Sin dictado en este navegador
        </p>
      )}
    </div>
  );
}
