'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Mic, Square, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import {
  voiceAddWait, voiceApplyCancel, voiceApplyMove, voiceApplyStatus, voiceConfirmBook,
  voiceFind, voiceLate, voiceMatchClient, voicePreviewBook, voicePreviewCancel, voicePreviewMove,
  voicePreviewStatus, voicePreviewWait, voiceReport, voiceSlots, voiceToday, voiceWaiting,
} from '@/app/actions/voice';
import { voiceTalk } from '@/app/actions/voice-talk';
import { voiceSpeakMp3, type VoiceSpeakResult } from '@/app/actions/voice-speak';
import VoiceWaves from '@/components/VoiceWaves';
import { forEar, parseVoice, splitWake, wakeRestIsCommand } from '@/lib/voice';
import {
  INITIAL, step, stepHint, type Call, type DialogEvent, type DialogState, type Effect, type PanelSpec,
} from '@/lib/voice-dialog';
import { voiceLog } from '@/lib/voice-log';
import { dialogOpen, settleMs } from '@/lib/voice-listen';
import { voiceClipUrl } from '@/lib/voice-clips';
import { stitchVoice } from '@/lib/voice-stitch';
import { VOICE_PREFS_EVENT, getVoicePrefs, setVoicePrefs, wakeWanted, type VoicePrefs } from '@/hooks/voice-prefs';
import {
  decodeB64, decodeUrl, isHot, playB64, playUrls, speakLocal, stopVoicePlay, warmVoiceAudio,
} from '@/hooks/voice-play';
import { micBlockedSay, queryMicPerm, requestMic, watchMicPerm, type MicPerm } from '@/hooks/voice-mic';

/** Lo que se pinta. Lo que se decide vive en lib/voice-dialog. */
type Panel =
  | { mode: 'idle' }
  | { mode: 'listen'; draft: string }
  | PanelSpec;

const ttsB64 = new Map<string, VoiceSpeakResult>();
let speakGen = 0;
let thinkGen = 0;
let speaking = false;

function withTime<T>(p: Promise<T>, ms: number) {
  return new Promise<T | null>(resolve => {
    const t = window.setTimeout(() => resolve(null), ms);
    p.then(v => { window.clearTimeout(t); resolve(v); }).catch(() => {
      window.clearTimeout(t);
      resolve(null);
    });
  });
}

function prefetchSpeak(text: string, kind: 'ask' | 'say') {
  if (stitchVoice(text)) return;
  const key = `${kind}:${text}`;
  if (ttsB64.has(key) || !getVoicePrefs().cloud) return;
  void withTime(voiceSpeakMp3(text, kind), 6000).then(payload => {
    if (!payload) return;
    ttsB64.set(key, payload);
    void decodeB64(key, payload.b64);
  });
}

function warmAudio() {
  warmVoiceAudio();
  for (const t of ['¿Dime?', '¿Qué servicio?', '¿A qué hora?', 'Sin red. Escríbelo abajo.']) {
    const clip = voiceClipUrl(t);
    if (clip) void decodeUrl(clip, clip);
  }
}

function stopSpeak() {
  speakGen += 1;
  speaking = false;
  stopVoicePlay();
}

async function playCloud(text: string, kind: 'ask' | 'say') {
  if (!getVoicePrefs().cloud) return false;
  const key = `${kind}:${text}`;
  let payload = ttsB64.get(key) ?? null;
  if (!payload) {
    payload = await withTime(voiceSpeakMp3(text, kind), 12000);
    if (!payload) return false;
    ttsB64.set(key, payload);
    if (ttsB64.size > 40) {
      const first = ttsB64.keys().next().value;
      if (first) ttsB64.delete(first);
    }
  }
  return playB64(key, payload.b64, { mime: payload.mime });
}

function wait(ms: number) {
  return new Promise<void>(r => window.setTimeout(r, ms));
}

/** Clip → nube → (quien llama) texto grande. */
async function utter(text: string, ask: boolean) {
  const ear = forEar(text);
  warmVoiceAudio();
  const parts = stitchVoice(text) ?? stitchVoice(ear);
  // La espera es para que el AudioContext despierte; si los clips ya están calientes, sobra.
  if (!parts || !isHot(parts)) await wait(180);
  if (parts?.length) {
    voiceLog('tts_clip', { n: ear.length, parts: parts.length });
    const ok = await playUrls(parts);
    if (ok) return true;
    voiceLog('tts_fail', { reason: 'clip_play' });
  }
  const ok = await playCloud(ear, ask ? 'ask' : 'say');
  if (ok) return true;
  voiceLog('tts_fail', { reason: 'cloud' });
  void voiceReport('(tts)', 'tts_fail', 'cloud');
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    await speakLocal(ear, ask);
    return true;
  }
  return false;
}

function afterSpeak(gen: number, onDone?: (heard: boolean) => void, heard = true) {
  window.setTimeout(() => {
    if (gen !== speakGen) return;
    onDone?.(heard);
  }, 200);
}

function speak(text: string, onDone?: (heard: boolean) => void) {
  if (typeof window === 'undefined' || !getVoicePrefs().speak) {
    const gen = ++speakGen;
    speaking = true;
    afterSpeak(gen, () => {
      speaking = false;
      onDone?.(true);
    });
    return;
  }
  stopSpeak();
  const gen = ++speakGen;
  speaking = true;
  const ask = /\?/.test(text);
  const parts = stitchVoice(text);
  let done = false;
  const finish = (heard: boolean) => {
    if (done || gen !== speakGen) return;
    done = true;
    afterSpeak(gen, () => {
      speaking = false;
      onDone?.(heard);
    }, heard);
  };
  const safety = window.setTimeout(() => finish(false), parts && parts.length > 1 ? 22000 : 14000);
  void utter(text, ask).then(heard => {
    window.clearTimeout(safety);
    finish(heard);
  });
}

/** Al tocar el micro: misma Elvira, aunque las respuestas habladas estén apagadas. */
function sayDime(onDone: () => void) {
  stopSpeak();
  const gen = ++speakGen;
  speaking = true;
  let done = false;
  const finish = () => {
    if (done || gen !== speakGen) return;
    done = true;
    afterSpeak(gen, () => {
      speaking = false;
      onDone();
    });
  };
  const safety = window.setTimeout(finish, 8000);
  void utter('¿Dime?', true).then(() => {
    window.clearTimeout(safety);
    finish();
  });
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
  /** Estado del diálogo (qué pregunta, qué confirma, qué cita propone). */
  const dialogRef = useRef<DialogState>(INITIAL);
  const dispatchRef = useRef<(e: DialogEvent) => void>(() => {});
  const genRef = useRef(0);
  const listenRef = useRef(false);
  const overlayRef = useRef(false);
  const draftRef = useRef('');
  const commitRef = useRef<() => void>(() => {});
  const [hearing, setHearing] = useState(false);
  const [heardDraft, setHeardDraft] = useState('');
  const [armed, setArmed] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);
  const [sayLoud, setSayLoud] = useState(false);
  const armedRef = useRef(false);
  const hushRef = useRef(false);
  const busyRef = useRef(false);
  const prefsRef = useRef<VoicePrefs>(getVoicePrefs());
  const wakeRef = useRef(false);
  const startWakeRef = useRef<() => void>(() => {});
  const ignoreOutsideRef = useRef(0);
  const missesRef = useRef(0);
  /** Temporizador del «casi final» del dictado. */
  const settleRef = useRef<number | null>(null);
  const startListenRef = useRef<(opts?: { overlay?: boolean }) => void>(() => {});
  const wakeWaitRef = useRef(800);
  const wakeDogRef = useRef<number | null>(null);
  const lastSayRef = useRef('');
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasMic, setHasMic] = useState(false);
  const [micPerm, setMicPerm] = useState<MicPerm>('unknown');
  const micRef = useRef<MicPerm>('unknown');

  // Con el panel abierto, el audio ya está despierto: la primera frase sale sin la espera.
  useEffect(() => {
    if (open) warmAudio();
  }, [open]);

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
    thinkGen += 1;
    listenRef.current = false;
    overlayRef.current = false;
    draftRef.current = '';
    setHearing(false);
    setHeardDraft('');
    killRec();
    stopSpeak();
    if (wakeDogRef.current) window.clearTimeout(wakeDogRef.current);
    wakeDogRef.current = null;
    dialogRef.current = { ...INITIAL };
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
    killRec();
    setOpen(true);
    setPanel(say ? { mode: 'msg', say } : { mode: 'idle' });
  };

  const applyMic = (perm: MicPerm) => {
    micRef.current = perm;
    setMicPerm(perm);
    if (perm !== 'granted') {
      armedRef.current = false;
      setArmed(false);
      if (wakeRef.current) {
        genRef.current += 1;
        wakeRef.current = false;
        setWakeOn(false);
        killRec();
      }
    }
  };

  useEffect(() => {
    setHasMic(!!makeRec());
    syncPrefs();
    const onFirst = () => warmAudio();
    window.addEventListener('pointerdown', onFirst, { once: true });
    window.addEventListener('touchstart', onFirst, { once: true });
    const stopWatch = watchMicPerm(perm => {
      applyMic(perm);
      if (perm === 'granted' && wakeWanted(prefsRef.current) && !hushRef.current) {
        arm();
        startWakeRef.current();
      }
    });
    void queryMicPerm().then(perm => {
      applyMic(perm);
      if (perm === 'granted' && wakeWanted(prefsRef.current)) {
        prefetchSpeak('¿Dime?', 'ask');
        arm();
        window.setTimeout(() => startWakeRef.current(), 400);
      }
    });
    const onPrefs = () => {
      syncPrefs();
      if (wakeWanted(prefsRef.current) && micRef.current === 'granted') {
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
      void queryMicPerm().then(perm => {
        if (perm !== 'unknown') applyMic(perm);
        if (perm === 'granted' && !hushRef.current) {
          window.setTimeout(() => startWakeRef.current(), 600);
        }
      });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopWatch();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(VOICE_PREFS_EVENT, onPrefs);
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('touchstart', onFirst);
    };
  }, []);

  useEffect(() => {
    const sheet = ['new', 'appt', 'alta', 'editar', 'close', 'block', 'bloqueo', 'wait']
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
      // Con texto, el settle cierra. Este tope solo evita un oído vacío eterno.
      if (heardDraft.trim()) return;
      const t = window.setTimeout(() => commitRef.current(), 22000);
      return () => window.clearTimeout(t);
    }
    if (panel.mode === 'ask' || panel.mode === 'confirm') return;
    if (dialogOpen(dialogRef.current)) return;
    if (panel.mode === 'idle' && typed.trim()) return;
    if (panel.mode !== 'idle') return;
    const t = window.setTimeout(() => {
      if (listenRef.current || speaking) return;
      dismiss();
    }, 8000);
    return () => window.clearTimeout(t);
  }, [open, panel.mode, typed, heardDraft]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (listenRef.current || speaking) return;
      if (dialogOpen(dialogRef.current)) return;
      if (Date.now() < ignoreOutsideRef.current) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) dismiss();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  /** Hablar y, al acabar, cerrar el panel (tras dejar leer si no sonó). */
  const closeAfterSpeak = (say: string, ear?: string) => {
    const gen = ++genRef.current;
    killRec();
    speak(ear ?? say, heard => {
      if (!heard) setSayLoud(true);
      window.setTimeout(() => {
        if (gen !== genRef.current) return;
        setPanel({ mode: 'idle' });
        setOpen(false);
        startWakeRef.current();
      }, heard ? 400 : 2800);
    });
  };

  /** Las server actions, por nombre. El diálogo (lib/voice-dialog) decide cuál y con qué. */
  const runCall = (c: Call): Promise<unknown> => {
    switch (c.action) {
      case 'previewBook': return voicePreviewBook(...c.args);
      case 'previewWait': return voicePreviewWait(...c.args);
      case 'previewStatus': return voicePreviewStatus(...c.args);
      case 'previewCancel': return voicePreviewCancel(...c.args);
      case 'previewMove': return voicePreviewMove(...c.args);
      case 'slots': return voiceSlots(...c.args);
      case 'find': return voiceFind(...c.args);
      case 'late': return voiceLate(...c.args);
      case 'waiting': return voiceWaiting(...c.args);
      case 'today': return voiceToday();
      case 'matchClient': return voiceMatchClient(...c.args);
      case 'talk': return voiceTalk(...c.args);
      case 'confirmBook': return voiceConfirmBook(...c.args);
      case 'applyMove': return voiceApplyMove(...c.args);
      case 'applyCancel': return voiceApplyCancel(...c.args);
      case 'applyStatus': return voiceApplyStatus(...c.args);
      case 'addWait': return voiceAddWait(...c.args);
    }
  };

  const runEffect = (fx: Effect) => {
    switch (fx.kind) {
      case 'panel':
        setSayLoud(false);
        setOpen(true);
        if (fx.panel.mode === 'ask' || fx.panel.mode === 'confirm' || fx.panel.mode === 'msg') {
          lastSayRef.current = fx.panel.say;
          prefetchSpeak(fx.panel.say, fx.panel.mode === 'msg' ? 'say' : 'ask');
        }
        setPanel(fx.panel);
        return;
      case 'speak':
        if (fx.then === 'close') {
          closeAfterSpeak(fx.text, fx.ear);
          return;
        }
        missesRef.current = 0;
        speak(fx.ear ?? fx.text, heard => {
          if (!heard) setSayLoud(true);
          startListenRef.current({ overlay: true });
        });
        return;
      case 'navigate':
        router.push(fx.href);
        return;
      case 'call': {
        const think = ++thinkGen;
        const timer = window.setTimeout(() => {
          if (think !== thinkGen || speaking || listenRef.current) return;
          speaking = true;
          void utter('Un segundo.', false).finally(() => {
            if (think === thinkGen) speaking = false;
          });
        }, 750);
        startTransition(async () => {
          let result: unknown;
          try {
            result = await runCall(fx.call);
          } catch (e) {
            thinkGen += 1;
            window.clearTimeout(timer);
            const offline = (typeof navigator !== 'undefined' && !navigator.onLine)
              || /fetch|network|load failed/i.test(String(e));
            voiceLog('stt_error', { error: offline ? 'network' : 'action', action: fx.call.action });
            dispatch({ kind: offline ? 'offline' : 'error', call: fx.call });
            return;
          }
          thinkGen += 1;
          window.clearTimeout(timer);
          dispatch({ kind: 'server', call: fx.call, result });
        });
        return;
      }
      case 'report':
        void voiceReport(fx.said, fx.outcome, fx.detail ?? null);
        return;
      case 'dismiss':
        dismiss();
        return;
    }
  };

  const dispatch = (event: DialogEvent) => {
    const { state, effects } = step(dialogRef.current, event);
    dialogRef.current = state;
    for (const fx of effects) runEffect(fx);
  };
  dispatchRef.current = dispatch;

  const runText = (text: string) => dispatch({ kind: 'heard', text });

  const commitListen = () => {
    if (!listenRef.current) return;
    const text = draftRef.current.trim() || typed.trim();
    const overlay = overlayRef.current;
    listenRef.current = false;
    overlayRef.current = false;
    genRef.current += 1;
    killRec();
    setHearing(false);
    setHeardDraft('');
    warmVoiceAudio();
    if (text) {
      missesRef.current = 0;
      setTyped('');
      draftRef.current = '';
      const wake = splitWake(text);
      if (wake.woke && !wakeRestIsCommand(wake.rest)) {
        window.setTimeout(() => startListenRef.current(overlay ? { overlay: true } : undefined), 180);
        return;
      }
      runText(wake.woke && wake.rest ? wake.rest : text);
      return;
    }
    if (overlay) {
      setOpen(true);
      if (dialogOpen(dialogRef.current)) {
        missesRef.current += 1;
        const again = () => startListenRef.current({ overlay: true });
        if (missesRef.current % 3 === 0 && lastSayRef.current) {
          speak(lastSayRef.current, again);
          return;
        }
        again();
        return;
      }
      missesRef.current += 1;
      if (missesRef.current < 3) {
        startListenRef.current({ overlay: true });
        return;
      }
      missesRef.current = 0;
      window.setTimeout(() => startWakeRef.current(), 400);
      return;
    }
    setOpen(true);
    setPanel({ mode: 'idle' });
    window.setTimeout(() => startWakeRef.current(), 400);
  };
  commitRef.current = commitListen;

  const startWake = () => {
    if (!wakeWanted(prefsRef.current) || hushRef.current || busyRef.current || document.hidden) return;
    if (micRef.current !== 'granted') return;
    if (listenRef.current || overlayRef.current || speaking) return;
    if (dialogOpen(dialogRef.current)) {
      startListenRef.current({ overlay: true });
      return;
    }
    if (wakeRef.current && recRef.current) return;
    if (!makeRec()) return;
    arm();
    const gen = ++genRef.current;
    killRec();
    const rec = makeRec();
    if (!rec) return;
    rec.interimResults = true;
    rec.continuous = true;
    recRef.current = rec;
    wakeRef.current = true;
    setWakeOn(true);
    if (wakeDogRef.current) window.clearTimeout(wakeDogRef.current);
    wakeDogRef.current = window.setTimeout(() => {
      if (gen !== genRef.current || !wakeRef.current) return;
      wakeRef.current = false;
      setWakeOn(false);
      killRec();
      startWakeRef.current();
    }, 14000);
    const clearDog = () => {
      if (wakeDogRef.current) window.clearTimeout(wakeDogRef.current);
      wakeDogRef.current = null;
    };
    const fireWake = (heard: string) => {
      if (gen !== genRef.current) return;
      const wake = splitWake(heard);
      const spoken = wake.woke && wake.rest ? wake.rest : heard;
      const cmd = parseVoice(spoken);
      const useful = cmd.kind !== 'unknown';
      if (!wake.woke && !useful) return;
      if (settleRef.current) window.clearTimeout(settleRef.current);
      settleRef.current = null;
      clearDog();
      wakeRef.current = false;
      setWakeOn(false);
      genRef.current += 1;
      killRec();
      wakeWaitRef.current = 800;
      if (useful || wakeRestIsCommand(wake.rest)) {
        setOpen(true);
        setPanel({ mode: 'listen', draft: '' });
        runText(spoken);
        return;
      }
      window.setTimeout(() => startListenRef.current(), 180);
    };
    rec.onresult = ev => {
      if (gen !== genRef.current) return;
      let text = '';
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i]?.[0]?.transcript ?? '';
      }
      const heard = text.trim();
      if (!heard) return;
      const wake = splitWake(heard);
      const spoken = wake.woke && wake.rest ? wake.rest : heard;
      const useful = wake.woke || parseVoice(spoken).kind !== 'unknown';
      if (!useful) return;
      if (settleRef.current) window.clearTimeout(settleRef.current);
      const onlyWake = wake.woke && !wakeRestIsCommand(wake.rest);
      settleRef.current = window.setTimeout(() => fireWake(heard), settleMs(heard, onlyWake ? 'wake' : 'listen'));
    };
    rec.onerror = ev => {
      if (gen !== genRef.current) return;
      clearDog();
      wakeRef.current = false;
      setWakeOn(false);
      if (ev.error === 'not-allowed') {
        voiceLog('stt_error', { error: ev.error, wake: true });
        applyMic('denied');
        return;
      }
      if (ev.error === 'no-speech') {
        wakeWaitRef.current = Math.min(2000, Math.round(wakeWaitRef.current * 1.3));
        window.setTimeout(() => startWakeRef.current(), wakeWaitRef.current);
        return;
      }
      if (ev.error && ev.error !== 'aborted') voiceLog('stt_error', { error: ev.error, wake: true });
      wakeWaitRef.current = Math.min(2000, Math.round(wakeWaitRef.current * 1.25));
      window.setTimeout(() => startWakeRef.current(), Math.max(700, wakeWaitRef.current));
    };
    rec.onend = () => {
      if (gen !== genRef.current) return;
      clearDog();
      wakeRef.current = false;
      setWakeOn(false);
      if (!wakeWanted(prefsRef.current) || busyRef.current || listenRef.current || speaking || document.hidden || hushRef.current) return;
      window.setTimeout(() => startWakeRef.current(), wakeWaitRef.current);
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
    if (micRef.current !== 'granted') {
      restIdle(micBlockedSay());
      return;
    }
    if (speaking) stopSpeak();
    if (!prefsRef.current.micOnly) hushRef.current = false;
    arm();
    wakeRef.current = false;
    setWakeOn(false);
    const gen = ++genRef.current;
    draftRef.current = '';
    listenRef.current = true;
    overlayRef.current = !!opts?.overlay;
    setHearing(true);
    killRec();
    const rec = makeRec();
    if (!rec) {
      setOpen(true);
      if (!opts?.overlay) setPanel({ mode: 'msg', say: 'Este Safari no dicta. Escribe el comando abajo.' });
      return;
    }
    rec.continuous = true;
    recRef.current = rec;
    ignoreOutsideRef.current = Date.now() + 2000;
    setOpen(true);
    if (!opts?.overlay) setPanel({ mode: 'listen', draft: '' });
    const clearSettle = () => {
      if (settleRef.current) window.clearTimeout(settleRef.current);
      settleRef.current = null;
    };
    rec.onresult = ev => {
      if (gen !== genRef.current) return;
      let text = '';
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i]?.[0]?.transcript ?? '';
      }
      draftRef.current = text.trim();
      setHeardDraft(draftRef.current);
      if (!opts?.overlay) setPanel({ mode: 'listen', draft: draftRef.current });
      clearSettle();
      // No commitar en el primer «final»: en iPad es el primer silencio, no el final de la frase.
      if (draftRef.current) {
        const wait = settleMs(draftRef.current);
        settleRef.current = window.setTimeout(() => {
          if (gen !== genRef.current || !listenRef.current) return;
          commitListen();
        }, wait);
      }
    };
    rec.onerror = ev => {
      if (gen !== genRef.current) return;
      clearSettle();
      const err = ev.error ?? '';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        voiceLog('stt_error', { error: err, wake: false });
        applyMic('denied');
        listenRef.current = false;
        overlayRef.current = false;
        killRec();
        restIdle(micBlockedSay());
        return;
      }
      if (err === 'network' || err === 'audio-capture') {
        voiceLog('stt_error', { error: err, wake: false });
        void voiceReport(draftRef.current || '(sin texto)', 'stt_error', err);
        listenRef.current = false;
        overlayRef.current = false;
        killRec();
        setHearing(false);
        const say = err === 'network' ? 'Sin red. Escríbelo abajo.' : 'No encuentro el micro. Escríbelo abajo.';
        setOpen(true);
        setSayLoud(false);
        setPanel({ mode: 'msg', say });
        speak(say, heard => { if (!heard) setSayLoud(true); });
        return;
      }
      // no-speech, aborted y el resto: lo que haya en el borrador, o nada.
      commitListen();
    };
    rec.onend = () => {
      if (gen !== genRef.current) return;
      if (draftRef.current) {
        if (!settleRef.current) {
          settleRef.current = window.setTimeout(() => {
            if (gen !== genRef.current || !listenRef.current) return;
            commitListen();
          }, settleMs(draftRef.current));
        }
        return;
      }
      clearSettle();
      if (opts?.overlay && dialogOpen(dialogRef.current)) {
        window.setTimeout(() => {
          if (gen !== genRef.current || !listenRef.current) return;
          startListenRef.current({ overlay: true });
        }, 280);
        return;
      }
      commitListen();
    };
    try {
      rec.start();
    } catch {
      listenRef.current = false;
      overlayRef.current = false;
      if (opts?.overlay) {
        window.setTimeout(() => startListenRef.current({ overlay: true }), 450);
        return;
      }
      restIdle('No he podido oír. Toca el micro otra vez.');
    }
  };
  startListenRef.current = startListen;

  const tapMic = (opts?: { overlay?: boolean }) => {
    warmAudio();
    if (hearing) {
      commitListen();
      return;
    }
    const listen = () => {
      setOpen(true);
      if (opts?.overlay) {
        startListen(opts);
        return;
      }
      if (!opts?.overlay) setPanel({ mode: 'listen', draft: '' });
      sayDime(() => startListen(opts));
    };
    if (micRef.current === 'granted') {
      listen();
      return;
    }
    void requestMic().then(perm => {
      applyMic(perm);
      if (perm !== 'granted') {
        restIdle(micBlockedSay());
        return;
      }
      arm();
      window.setTimeout(listen, 120);
    });
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] standalone:bottom-[calc(5.25rem+max(6px,calc(env(safe-area-inset-bottom)-12px)))] z-30 flex flex-col items-end px-3"
    >
      {open && (
        <div className="pointer-events-auto mb-2 w-full max-w-[360px] rounded-row border border-surface-line bg-surface-card p-3 shadow-toast">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-micro font-bold uppercase tracking-wide text-ink-3">
              {stepHint(dialogRef.current.pending?.need, panel.mode === 'confirm') ?? (hearing ? 'Oyendo' : 'Voz')}
            </p>
            <IconButton label="Cerrar" tone="ghost" onClick={dismiss}>
              <X size={18} strokeWidth={2.4} />
            </IconButton>
          </div>
          {panel.mode === 'listen' && (
            <VoiceWaves label={pending ? 'Un segundo' : hearing ? 'Escuchando' : 'Dime'} />
          )}
          {hearing && heardDraft && (
            <p className="mb-2 text-label font-semibold text-ink">{heardDraft}</p>
          )}
          {hearing && (
            <button
              type="button"
              onClick={() => commitRef.current()}
              className="mb-2 min-h-[44px] w-full rounded-chip bg-v-soft px-3 text-label font-bold text-v-d"
            >
              Listo
            </button>
          )}
          {panel.mode === 'msg' && (
            <div>
              <p className={`font-semibold text-ink-2 ${sayLoud ? 'text-title leading-snug' : 'text-body'}`}>
                {panel.say}
              </p>
              {(hearing || pending) && (
                <div className="mt-2">
                  <VoiceWaves label={pending ? 'Un segundo' : 'Escuchando'} />
                </div>
              )}
            </div>
          )}
          {panel.mode === 'ask' && (
            <div>
              <p className="text-body font-semibold text-ink-2">{panel.say}</p>
              {hearing || pending ? (
                <div className="mt-2">
                  <VoiceWaves label={pending ? 'Un segundo' : dialogRef.current.pending?.need === 'time' ? 'Dilo o toca una hora' : 'Escuchando'} />
                </div>
              ) : (
                <p className="mt-1 text-label font-semibold text-v-d">
                  Toca el micro y dilo, o elige abajo.
                </p>
              )}
              {panel.options && panel.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {panel.options.map(opt => (
                    <button
                      key={opt}
                      disabled={pending}
                      onClick={() => dispatch({ kind: 'tap', option: opt })}
                      className="min-h-[44px] rounded-chip bg-v-soft px-3 py-2 text-label font-bold text-v-d"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {panel.href && (
                <button
                  type="button"
                  onClick={() => dispatch({ kind: 'open-alta', href: panel.href! })}
                  className="mt-2 text-caption font-bold text-ink-3"
                >
                  Abrir el alta a mano
                </button>
              )}
            </div>
          )}
          {panel.mode === 'confirm' && (
            <div>
              <p className="text-body font-semibold text-ink-2">{panel.say}</p>
              {hearing || pending ? (
                <div className="mt-2">
                  <VoiceWaves label={pending ? 'Un segundo' : 'Di sí o no'} />
                </div>
              ) : (
                <p className="mt-1 text-label font-semibold text-v-d">Di sí, o toca Sí.</p>
              )}
              {panel.choices && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {panel.choices.map(c => (
                    <button
                      key={c.id}
                      disabled={pending}
                      onClick={() => dispatch({ kind: 'choose', choice: c })}
                      className="rounded-chip border border-surface-line bg-v-tint px-3 py-2 text-left text-label font-bold text-v-d"
                    >
                      {c.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={dismiss}
                    className="min-h-[44px] rounded-chip border border-surface-line px-3 text-label font-bold text-ink-2"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {!panel.choices && (
                <div className="mt-2 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={dismiss}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={pending}
                    onClick={() => dispatch({ kind: 'yes' })}
                  >
                    Sí
                  </Button>
                </div>
              )}
            </div>
          )}
          {panel.mode === 'idle' && (
            <div className="text-label font-medium leading-snug text-ink-2">
              <p className="font-bold text-ink">Así se usa</p>
              <p className="mt-1">1. Toca el micro: dice «¿Dime?» y te oye. O «Hola Marlén» y el comando. En Ajustes se apaga el oído.</p>
              <p>2. Si va a guardar, te pide confirmación. Si no dicta, escribe el comando abajo.</p>
      <p className="mt-2 text-label text-ink-2">
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
              className="min-w-0 flex-1 rounded-chip border border-surface-line px-3 py-2 text-[16px] font-semibold leading-snug"
              placeholder="Escribe o dicta el comando"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              aria-label="Comando"
            />
            <button className="rounded-chip bg-v-soft px-3 py-2 text-label font-bold text-v-d">Ir</button>
          </form>
        </div>
      )}
      <div className="relative">
        <button
          type="button"
          aria-label={hearing ? 'Dejar de escuchar' : 'Hablar con Marlén'}
          aria-pressed={hearing}
          onClick={() => {
            const overlay = open && (
              panel.mode === 'ask' || panel.mode === 'confirm' || panel.mode === 'msg'
              || dialogOpen(dialogRef.current)
            );
            tapMic(overlay ? { overlay: true } : undefined);
          }}
          className={`pointer-events-auto grid h-14 w-14 place-items-center rounded-card text-white shadow-btn transition motion-safe:active:scale-[.96] ${
            hearing ? 'bg-danger' : 'bg-grad'
          }`}
        >
          {hearing ? <Square size={20} strokeWidth={2.4} /> : <Mic size={22} strokeWidth={2.2} />}
        </button>
        {armed && !hearing && !open && (
          <button
            type="button"
            title={wakeOn ? 'Oído en espera. Toca para callar.' : 'Oído en pausa. Toca el micro para hablar.'}
            aria-label="Callar oído de Hola Marlén"
            onClick={e => { e.stopPropagation(); hush(); }}
            className="pointer-events-auto absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-surface-card/80 shadow"
          />
        )}
      </div>
      {!open && !hearing && micPerm !== 'granted' && micPerm !== 'unknown' && (
        <p className="pointer-events-none mt-1 max-w-[220px] text-right text-micro font-semibold text-ink-3">
          Toca el micro para permitir el oído
        </p>
      )}
      {!hasMic && open && (
        <p className="pointer-events-none mt-1 text-right text-micro font-semibold text-ink-3">
          Sin dictado en este navegador
        </p>
      )}
    </div>
  );
}
