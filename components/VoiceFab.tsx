'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Mic, Square, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import {
  voiceAddWait, voiceApplyCancel, voiceApplyMove, voiceApplyStatus, voiceConfirmBook,
  voiceMatchClient, voicePreviewBook, voicePreviewCancel, voicePreviewMove, voicePreviewStatus, voicePreviewWait,
  voiceReport, voiceSlots, voiceToday,
  type PendingBook,
} from '@/app/actions/voice';
import { NEW_CLIENT_CHIP } from '@/lib/voice-clients';
import { voiceTalk, type VoiceTalkResult, type VoiceTurn } from '@/app/actions/voice-talk';
import { voiceSpeakMp3, type VoiceSpeakResult } from '@/app/actions/voice-speak';
import VoiceWaves from '@/components/VoiceWaves';
import {
  VOICE_HELP, fold, forEar, isVoiceYes, parseBookLoose, parseVoice, pickSpokenIndex, saidDayOffset, splitWake,
  takeTime, wakeRestIsCommand,
} from '@/lib/voice';
import { voiceLog } from '@/lib/voice-log';
import { voiceClipUrl } from '@/lib/voice-clips';
import { stitchVoice } from '@/lib/voice-stitch';
import { VOICE_PREFS_EVENT, getVoicePrefs, setVoicePrefs, wakeWanted, type VoicePrefs } from '@/hooks/voice-prefs';
import {
  decodeB64, decodeUrl, isHot, playB64, playUrls, stopVoicePlay, warmVoiceAudio,
} from '@/hooks/voice-play';
import { micBlockedSay, queryMicPerm, requestMic, watchMicPerm, type MicPerm } from '@/hooks/voice-mic';

type Choice = { id: string; label: string };

/** «No», «nah», «para», «déjalo», «así no»: cerrar lo que se estaba confirmando. */
const VOICE_NO = /^(no+|nah|nop|que no|ahora no|mejor no|para|parate|dejalo|dejalo asi|asi no|quita|cancelar?|anula|nada|olvidalo)(\b.*)?$/;
type Panel =
  | { mode: 'idle' }
  | { mode: 'listen'; draft: string }
  | { mode: 'msg'; say: string }
  | { mode: 'ask'; say: string; options?: string[]; href?: string }
  | {
    mode: 'confirm';
    say: string;
    status?: 'curso' | 'noshow';
    /** Qué se hace con la opción elegida cuando hay varias. */
    pick?: 'status' | 'cancel' | 'wait' | 'move';
    moveTo?: NonNullable<VoiceTalkResult['moveTo']>;
    run: () => Promise<{ ok: boolean; say: string; href?: string; ear?: string }>;
    choices?: Choice[];
  };

const ttsB64 = new Map<string, VoiceSpeakResult>();
let speakGen = 0;
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
  const clip = voiceClipUrl('¿Dime?');
  if (clip) void decodeUrl(clip, clip);
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
  if (!ok) voiceLog('tts_fail', { reason: 'cloud' });
  return ok;
}

function afterSpeak(gen: number, onDone?: (heard: boolean) => void, heard = true) {
  window.setTimeout(() => {
    if (gen !== speakGen) return;
    onDone?.(heard);
  }, 320);
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
  const pendingRef = useRef<PendingBook | null>(null);
  const confirmRef = useRef<Extract<Panel, { mode: 'confirm' }> | null>(null);
  const bookRef = useRef<VoiceTalkResult['book'] | null>(null);
  const genRef = useRef(0);
  const listenRef = useRef(false);
  const overlayRef = useRef(false);
  const draftRef = useRef('');
  const optionsRef = useRef<string[]>([]);
  const commitRef = useRef<() => void>(() => {});
  const [hearing, setHearing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);
  const [sayLoud, setSayLoud] = useState(false);
  const historyRef = useRef<VoiceTurn[]>([]);
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
    killRec();
    stopSpeak();
    pendingRef.current = null;
    bookRef.current = null;
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
      const t = window.setTimeout(() => commitRef.current(), 12000);
      return () => window.clearTimeout(t);
    }
    if (panel.mode === 'ask' || panel.mode === 'confirm') return;
    if (panel.mode === 'idle' && typed.trim()) return;
    if (panel.mode !== 'idle' && panel.mode !== 'msg') return;
    const t = window.setTimeout(() => {
      if (listenRef.current || speaking) return;
      dismiss();
    }, 8000);
    return () => window.clearTimeout(t);
  }, [open, panel.mode, typed]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (listenRef.current || speaking) return;
      if (pendingRef.current || confirmRef.current) return;
      if (Date.now() < ignoreOutsideRef.current) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) dismiss();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const speakThenListen = (say: string, ear?: string) => {
    missesRef.current = 0;
    speak(ear ?? say, () => startListenRef.current({ overlay: true }));
  };

  const finish = (say: string, href?: string, ear?: string) => {
    const gen = ++genRef.current;
    killRec();
    setSayLoud(false);
    setPanel({ mode: 'msg', say });
    if (href) router.push(href);
    speak(ear ?? say, heard => {
      if (!heard) setSayLoud(true);
      window.setTimeout(() => {
        if (gen !== genRef.current) return;
        setPanel({ mode: 'idle' });
        setOpen(false);
        startWakeRef.current();
      }, heard ? 1400 : 4800);
    });
  };

  const remember = (user: string, say: string) => {
    historyRef.current = [
      ...historyRef.current,
      { role: 'user' as const, content: user },
      { role: 'assistant' as const, content: say },
    ].slice(-8);
  };

  /** Una de varias (cita o clienta), elegida con el dedo o de viva voz. */
  const runChoice = async (panelNow: Extract<Panel, { mode: 'confirm' }>, c: Choice) => {
    if (panelNow.pick === 'move' && panelNow.moveTo) {
      const m = panelNow.moveTo;
      applyTalk({ ...(await voicePreviewMove(m.who, m.startMin, m.dayOffset, m.providerQ, c.id)), move: true });
      return;
    }
    if (panelNow.pick === 'wait') {
      setPanel({ mode: 'confirm', say: `¿Apunto a ${c.label} en espera?`, run: () => voiceAddWait(c.label, c.id) });
      speakThenListen(`¿Apunto a ${c.label} en espera?`, '¿Apunto en espera?');
      return;
    }
    const r = panelNow.pick === 'cancel'
      ? await voiceApplyCancel(c.id)
      : await voiceApplyStatus(c.id, panelNow.status ?? 'noshow');
    finish(r.say, r.href);
  };

  /** «La primera», «la de las once», «Pérez»: qué opción de la lista han dicho. */
  const spokenChoice = (choices: Choice[], text: string): Choice | null => {
    const pick = pickSpokenIndex(text, choices.length);
    if (pick != null) return choices[pick];
    const clock = takeTime(text).startMin;
    if (clock !== null) {
      const hh = `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;
      const byTime = choices.filter(c => c.label.includes(` ${hh} `) || c.label.endsWith(hh) || c.label.includes(`· ${hh}`));
      if (byTime.length === 1) return byTime[0];
    }
    const said = fold(text).replace(/[¿?¡!.,]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
    const byName = choices.filter(c => {
      const label = fold(c.label.split('·')[0]);
      return said.some(w => label.split(/\s+/).some(t => t === w || (w.length >= 4 && t.startsWith(w))));
    });
    return byName.length === 1 ? byName[0] : null;
  };

  const applyTalk = (r: VoiceTalkResult) => {
    bookRef.current = null;
    if (r.matches && r.matches.length > 1) {
      setPanel({
        mode: 'confirm',
        say: r.say,
        status: r.status,
        choices: r.matches,
        pick: r.cancel ? 'cancel' : r.wait ? 'wait' : r.moveTo ? 'move' : 'status',
        moveTo: r.moveTo,
        run: async () => ({ ok: false, say: 'Elige una' }),
      });
      speakThenListen(r.say, r.ear);
      return;
    }
    if (r.ready && r.draft && r.move) {
      pendingRef.current = null;
      const draft = r.draft as { id: string; date: string; startMin: number; providerId: string };
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyMove(draft) });
      speakThenListen(r.say, r.ear);
      return;
    }
    if (r.ready && r.draft && !r.move && !r.draft.who) {
      pendingRef.current = null;
      bookRef.current = r.book ?? null;
      const draft = r.draft as Parameters<typeof voiceConfirmBook>[0];
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceConfirmBook(draft) });
      speakThenListen(r.say, r.ear);
      return;
    }
    if (r.draft && typeof r.draft.who === 'string') {
      const who = r.draft.who;
      const clientId = typeof r.draft.clientId === 'string' ? r.draft.clientId : null;
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceAddWait(who, clientId) });
      speakThenListen(r.say, r.ear);
      return;
    }
    if (r.matches?.length === 1 && r.cancel) {
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyCancel(r.matches![0].id) });
      speakThenListen(r.say, r.ear);
      return;
    }
    if (r.matches?.length === 1 && r.status) {
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyStatus(r.matches![0].id, r.status!) });
      speakThenListen(r.say, r.ear);
      return;
    }
    if ((r.need === 'client' || r.need === 'service' || r.need === 'time') && r.pending) {
      pendingRef.current = r.pending;
      optionsRef.current = r.options ?? r.pending.slotMins?.map(m => {
        const h = Math.floor(m / 60);
        return `${h}:${String(m % 60).padStart(2, '0')}`;
      }) ?? [];
      setPanel({ mode: 'ask', say: r.say, options: r.options, href: r.href });
      speakThenListen(r.say, r.ear);
      return;
    }
    pendingRef.current = null;
    finish(r.say, r.href, r.ear);
  };

  const continueBook = async (patch: Partial<PendingBook>) => {
    const held = pendingRef.current!;
    const p = { ...held, ...patch };
    const preview = await voicePreviewBook(
      p.who, p.startMin, p.serviceQ, p.dayOffset, p.providerQ,
      {
        choices: patch.choices === null ? null : (held.choices ?? null),
        prevNeed: held.need,
        asks: held.asks ?? 0,
        newClient: patch.newClient ?? held.newClient ?? false,
      },
    );
    applyTalk(preview);
  };

  const runText = (text: string) => {
    const said = fold(text);
    const confirming = confirmRef.current;
    if (confirming?.choices?.length) {
      const c = spokenChoice(confirming.choices, text);
      if (c) {
        startTransition(async () => { await runChoice(confirming, c); });
        return;
      }
    }
    if (confirming && !confirming.choices?.length && isVoiceYes(said)) {
      startTransition(async () => {
        const r = await confirming.run();
        finish(r.say, r.href, r.ear);
      });
      return;
    }
    if (confirming && (VOICE_NO.test(said) || parseVoice(text).kind === 'dismiss')) {
      dismiss();
      return;
    }
    // «¿La guardo?» y contestan «mejor a las doce» / «el jueves» / «la de una hora»: se corrige, no se empieza de cero.
    const book = confirming ? bookRef.current : null;
    if (book) {
      const clock = takeTime(text).startMin ?? (/^(mejor )?(a )?(la )?una$/.test(said) ? 13 * 60 : null);
      const day = saidDayOffset(text);
      const variant = /cavit|media hora|una hora|hora y media|dos horas|tres horas|minutos|corta|larga|gratuita/.test(said);
      if (clock !== null || day !== null || variant) {
        startTransition(async () => {
          applyTalk(await voicePreviewBook(
            book.who,
            clock ?? book.startMin,
            variant && book.serviceQ ? `${book.serviceQ} ${text}` : book.serviceQ,
            day ?? book.dayOffset,
            book.providerQ,
            { newClient: book.newClient ?? false },
          ));
        });
        return;
      }
    }

    startTransition(async () => {
      const cmd = parseVoice(text);
      voiceLog('parse_kind', { kind: cmd.kind, said: text.slice(0, 80) });
      // «¿Rosa María o Rosario? ¿O es nueva?» → «no» quiere decir «ninguna», no «cancela».
      const noMeansNew = pendingRef.current?.need === 'client' && optionsRef.current.length > 1
        && optionsRef.current.includes(NEW_CLIENT_CHIP) && /^(no|nah|que no)$/.test(said);
      if (cmd.kind === 'dismiss' && !noMeansNew) {
        dismiss();
        return;
      }
      if (cmd.kind === 'chat') {
        if (cmd.stay) {
          // La respuesta se queda en pantalla mientras escucha (overlay); si no sonó, en grande.
          setSayLoud(false);
          setPanel({ mode: 'msg', say: cmd.say });
          speak(cmd.say, heard => {
            if (!heard) setSayLoud(true);
            startListenRef.current({ overlay: true });
          });
        } else {
          finish(cmd.say);
        }
        return;
      }

      const held = pendingRef.current;
      const abortHeld = cmd.kind === 'today' || cmd.kind === 'cancel' || cmd.kind === 'go'
        || cmd.kind === 'slots' || cmd.kind === 'status' || cmd.kind === 'wait' || cmd.kind === 'move';
      if (held && !abortHeld) {
        const pick = pickSpokenIndex(text, optionsRef.current.length);
        if (held.need === 'client') {
          const opt = pick != null ? optionsRef.current[pick] : null;
          const onlyNew = optionsRef.current.length === 1 && optionsRef.current[0] === NEW_CLIENT_CHIP;
          const offersNew = optionsRef.current.includes(NEW_CLIENT_CHIP);
          if (opt === NEW_CLIENT_CHIP || /\b(nueva|nuevo|alta|apuntala|no esta|ninguna|de las dos no|otra)\b/.test(said)
            || (isVoiceYes(said) && onlyNew) || (offersNew && !onlyNew && /^(no|nah|que no)\b/.test(said))) {
            await continueBook({ newClient: true, choices: null });
            return;
          }
          if (onlyNew && VOICE_NO.test(said)) {
            dismiss();
            return;
          }
          if (opt) {
            await continueBook({ who: opt, choices: null });
            return;
          }
          const who = cmd.kind === 'book' ? cmd.who : text.trim();
          await continueBook({ who });
          return;
        }
        if (pick != null) {
          if (held.need === 'time' && held.slotMins?.[pick] != null) {
            await continueBook({ startMin: held.slotMins[pick] });
            return;
          }
          await continueBook({ serviceQ: optionsRef.current[pick] });
          return;
        }
        if (held.need === 'time') {
          const clock = takeTime(text).startMin
            ?? (cmd.kind === 'book' ? cmd.startMin : null)
            ?? (/^(a )?(la )?una( hora)?$/.test(said) ? 13 * 60 : null);
          if (clock !== null) {
            await continueBook({ startMin: clock });
            return;
          }
          if (held.serviceQ && /cavit|media|corta|larga|minutos|dos horas|hora y media|tres horas/.test(said)) {
            await continueBook({ serviceQ: `${held.serviceQ} ${text}`, startMin: held.startMin, choices: null });
            return;
          }
          await continueBook({ startMin: null, serviceQ: held.serviceQ });
          return;
        }
        const serviceQ = cmd.kind === 'book' && cmd.serviceQ
          ? cmd.serviceQ
          : text.trim();
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
        const loose = parseBookLoose(cmd.text);
        if (loose) {
          const client = await voiceMatchClient(loose.who);
          if (client) {
            applyTalk(await voicePreviewBook(client, loose.startMin, loose.serviceQ, loose.dayOffset, loose.providerQ));
            return;
          }
        }
        const talk = await voiceTalk(cmd.text, historyRef.current);
        if (!talk.fallback && talk.say) {
          remember(cmd.text, talk.say);
          applyTalk(talk);
          return;
        }
        void voiceReport(cmd.text, talk.reason === 'off' || talk.reason === 'rate' ? 'llm_off' : talk.reason === 'timeout' ? 'llm_timeout' : 'unknown', talk.reason ?? null);
        const say = talk.reason === 'off' || talk.reason === 'rate'
          ? 'Sin nube ahora. Dime servicio, hora o cita.'
          : 'No lo he pillado. Dime el servicio, la hora, o una cita.';
        setSayLoud(false);
        setPanel({ mode: 'msg', say });
        speak(say, heard => {
          if (!heard) setSayLoud(true);
          startListen();
        });
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
        finish(r.say, r.href, r.ear);
        return;
      }
      if (cmd.kind === 'wait') {
        if (!cmd.who) {
          finish('Lista de espera', '/agenda?wait=1');
          return;
        }
        applyTalk({ ...(await voicePreviewWait(cmd.who)) });
        return;
      }
      if (cmd.kind === 'status') {
        const preview = await voicePreviewStatus(cmd.who, cmd.status);
        if (!preview.ok || preview.matches.length === 0) {
          finish(preview.say, undefined, preview.ear);
          return;
        }
        if (preview.matches.length === 1) {
          const id = preview.matches[0].id;
          setPanel({
            mode: 'confirm',
            say: preview.say,
            run: () => voiceApplyStatus(id, cmd.status),
          });
          speakThenListen(preview.say, preview.ear);
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
        speakThenListen(preview.say, preview.ear);
        return;
      }
      if (cmd.kind === 'slots') {
        const r = await voiceSlots(cmd.dayOffset, cmd.startMin, cmd.providerQ, cmd.part ?? null);
        finish(r.say, r.href, r.ear);
        return;
      }
      if (cmd.kind === 'book') {
        applyTalk(await voicePreviewBook(cmd.who, cmd.startMin, cmd.serviceQ, cmd.dayOffset, cmd.providerQ));
        return;
      }
      if (cmd.kind === 'cancel') {
        const preview = await voicePreviewCancel(cmd.who, cmd.dayOffset);
        if (!preview.ok || preview.matches.length === 0) {
          finish(preview.say, undefined, preview.ear);
          return;
        }
        if (preview.matches.length === 1) {
          const id = preview.matches[0].id;
          setPanel({ mode: 'confirm', say: preview.say, run: () => voiceApplyCancel(id) });
          speakThenListen(preview.say, preview.ear);
          return;
        }
        setPanel({
          mode: 'confirm',
          say: preview.say,
          pick: 'cancel',
          choices: preview.matches,
          run: async () => ({ ok: false, say: 'Elige una' }),
        });
        speakThenListen(preview.say, preview.ear);
        return;
      }
      if (cmd.kind === 'move') {
        const preview = await voicePreviewMove(cmd.who, cmd.startMin, cmd.dayOffset, cmd.providerQ);
        if (!preview.ok) {
          finish(preview.say, preview.href, preview.ear);
          return;
        }
        applyTalk({ ...preview, move: true });
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
    if (pendingRef.current || confirmRef.current) return;
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
      const wake = splitWake(heard);
      const spoken = wake.woke && wake.rest ? wake.rest : heard;
      const cmd = parseVoice(spoken);
      const useful = cmd.kind !== 'unknown';
      if (!wake.woke && !useful) return;
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
    rec.onerror = ev => {
      if (gen !== genRef.current) return;
      wakeRef.current = false;
      setWakeOn(false);
      if (ev.error === 'not-allowed') {
        voiceLog('stt_error', { error: ev.error, wake: true });
        applyMic('denied');
        return;
      }
      if (ev.error === 'no-speech') {
        wakeWaitRef.current = Math.min(4000, Math.round(wakeWaitRef.current * 1.4));
        window.setTimeout(() => startWakeRef.current(), wakeWaitRef.current);
        return;
      }
      if (ev.error && ev.error !== 'aborted') voiceLog('stt_error', { error: ev.error, wake: true });
      wakeWaitRef.current = Math.min(4000, Math.round(wakeWaitRef.current * 1.25));
      window.setTimeout(() => startWakeRef.current(), Math.max(1200, wakeWaitRef.current));
    };
    rec.onend = () => {
      if (gen !== genRef.current) return;
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
      clearSettle();
      if (ev.results[ev.results.length - 1]?.isFinal && draftRef.current) {
        commitListen();
        return;
      }
      // «Casi final»: si Safari no manda el final, con 1,2 s sin cambios nos vale el borrador.
      if (draftRef.current) {
        settleRef.current = window.setTimeout(() => {
          if (gen !== genRef.current || !listenRef.current) return;
          commitListen();
        }, 1200);
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
      clearSettle();
      commitListen();
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
  startListenRef.current = startListen;

  const tapMic = (opts?: { overlay?: boolean }) => {
    warmAudio();
    if (hearing) {
      commitListen();
      return;
    }
    const listen = () => {
      setOpen(true);
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

  const sheetOpen = ['new', 'appt', 'alta', 'editar', 'close', 'block', 'bloqueo', 'wait']
    .some(k => searchParams.get(k));
  if (sheetOpen && !open) return null;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end px-3"
    >
      {open && (
        <div className="pointer-events-auto mb-2 w-full max-w-[360px] rounded-row border border-surface-line bg-surface-card p-3 shadow-toast">
          <div className="mb-1 flex justify-end">
            <IconButton label="Cerrar" tone="ghost" onClick={dismiss}>
              <X size={18} strokeWidth={2.4} />
            </IconButton>
          </div>
          {panel.mode === 'listen' && (
            <VoiceWaves label={pending ? 'Un segundo' : hearing ? 'Escuchando' : 'Dime'} />
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
                  <VoiceWaves label={pending ? 'Un segundo' : pendingRef.current?.need === 'time' ? 'Dilo o toca una hora' : 'Escuchando'} />
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
                      onClick={() => {
                        startTransition(async () => {
                          const held = pendingRef.current;
                          if (held?.need === 'client') {
                            await continueBook(opt === NEW_CLIENT_CHIP ? { newClient: true, choices: null } : { who: opt, choices: null });
                            return;
                          }
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
                      className="rounded-chip bg-v-soft px-2.5 py-1.5 text-caption font-bold text-v-d"
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
                      onClick={() => startTransition(async () => { await runChoice(panel, c); })}
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
                    onClick={() => startTransition(async () => {
                      const r = await panel.run();
                      finish(r.say, r.href, r.ear);
                    })}
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
              <p className="mt-1">1. Toca el micro: dice «¿Dime?» y te oye. O «Hola Marlenne» y el comando. En Ajustes se apaga el oído.</p>
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
          aria-label={hearing ? 'Dejar de escuchar' : 'Hablar con Marlenne'}
          aria-pressed={hearing}
          onClick={() => {
            const overlay = open && (panel.mode === 'ask' || panel.mode === 'confirm');
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
            aria-label="Callar oído de Hola Marlenne"
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
