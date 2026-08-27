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
import { VOICE_HELP, fold, forEar, isVoiceYes, parseVoice, pickSpokenIndex, splitWake, takeTime, wakeRestIsCommand } from '@/lib/voice';
import { VOICE_PREFS_EVENT, getVoicePrefs, setVoicePrefs, wakeWanted, type VoicePrefs } from '@/hooks/voice-prefs';
import {
  decodeB64, pickWomanVoice, playB64, speakLocal, stopVoicePlay, unlockSpeak, warmVoiceAudio,
} from '@/hooks/voice-play';
import { micBlockedSay, queryMicPerm, requestMic, watchMicPerm, type MicPerm } from '@/hooks/voice-mic';

type Choice = { id: string; label: string };
type Panel =
  | { mode: 'idle' }
  | { mode: 'listen'; draft: string }
  | { mode: 'msg'; say: string }
  | { mode: 'ask'; say: string; options?: string[]; href?: string }
  | { mode: 'confirm'; say: string; status?: 'curso' | 'noshow'; pick?: 'status' | 'cancel'; run: () => Promise<{ ok: boolean; say: string; href?: string }>; choices?: Choice[] };

const ttsB64 = new Map<string, string>();
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
  const key = `${kind}:${text}`;
  if (ttsB64.has(key)) return;
  void withTime(voiceSpeakMp3(text, kind), 6000).then(b64 => {
    if (!b64) return;
    ttsB64.set(key, b64);
    void decodeB64(key, b64);
  });
}

function warmAudio() {
  warmVoiceAudio();
  prefetchSpeak('¿Dime?', 'ask');
}

function stopSpeak() {
  speakGen += 1;
  speaking = false;
  stopVoicePlay();
}

async function playCloud(text: string, kind: 'ask' | 'say') {
  const key = `${kind}:${text}`;
  let b64 = ttsB64.get(key) ?? null;
  if (!b64) {
    b64 = await withTime(voiceSpeakMp3(text, kind), 6000);
    if (!b64) return false;
    ttsB64.set(key, b64);
    if (ttsB64.size > 40) {
      const first = ttsB64.keys().next().value;
      if (first) ttsB64.delete(first);
    }
  }
  return playB64(key, b64);
}

async function utter(text: string, ask: boolean) {
  const ear = forEar(text);
  const ok = await playCloud(ear, ask ? 'ask' : 'say');
  if (!ok) await speakLocal(ear, ask);
}

function afterSpeak(gen: number, onDone?: () => void) {
  window.setTimeout(() => {
    if (gen !== speakGen) return;
    onDone?.();
  }, 320);
}

function speak(text: string, onDone?: () => void) {
  if (typeof window === 'undefined' || !getVoicePrefs().speak) {
    const gen = ++speakGen;
    speaking = true;
    afterSpeak(gen, () => {
      speaking = false;
      onDone?.();
    });
    return;
  }
  stopSpeak();
  const gen = ++speakGen;
  speaking = true;
  const ask = /\?/.test(text);
  let done = false;
  const finish = () => {
    if (done || gen !== speakGen) return;
    done = true;
    afterSpeak(gen, () => {
      speaking = false;
      onDone?.();
    });
  };
  const safety = window.setTimeout(finish, 14000);
  void utter(text, ask).then(() => {
    window.clearTimeout(safety);
    finish();
  });
}

/** El «¿Dime?» del saludo usa el mismo TTS que el resto, aunque la voz de respuestas esté apagada. */
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
  const safety = window.setTimeout(finish, 14000);
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
  const missesRef = useRef(0);
  const startListenRef = useRef<(opts?: { overlay?: boolean }) => void>(() => {});
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasMic, setHasMic] = useState(false);
  const [micPerm, setMicPerm] = useState<MicPerm>('unknown');
  const micRef = useRef<MicPerm>('unknown');

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
    pickWomanVoice();
    const onVoices = () => pickWomanVoice();
    window.speechSynthesis?.addEventListener('voiceschanged', onVoices);
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

  const speakThenListen = (say: string) => {
    missesRef.current = 0;
    speak(say, () => startListenRef.current({ overlay: true }));
  };

  const finish = (say: string, href?: string) => {
    const gen = ++genRef.current;
    killRec();
    setPanel({ mode: 'msg', say });
    if (href) router.push(href);
    speak(say, () => {
      window.setTimeout(() => {
        if (gen !== genRef.current) return;
        setPanel({ mode: 'idle' });
        setOpen(false);
        startWakeRef.current();
      }, 1400);
    });
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
      speakThenListen(r.say);
      return;
    }
    if (r.ready && r.draft && r.move) {
      pendingRef.current = null;
      const draft = r.draft as { id: string; date: string; startMin: number; providerId: string };
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyMove(draft) });
      speakThenListen(r.say);
      return;
    }
    if (r.ready && r.draft && !r.move && !r.draft.who) {
      pendingRef.current = null;
      const draft = r.draft as Parameters<typeof voiceConfirmBook>[0];
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceConfirmBook(draft) });
      speakThenListen(r.say);
      return;
    }
    if (r.draft && typeof r.draft.who === 'string') {
      const who = r.draft.who;
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceAddWait(who) });
      speakThenListen(r.say);
      return;
    }
    if (r.matches?.length === 1 && r.cancel) {
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyCancel(r.matches![0].id) });
      speakThenListen(r.say);
      return;
    }
    if (r.matches?.length === 1 && r.status) {
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyStatus(r.matches![0].id, r.status!) });
      speakThenListen(r.say);
      return;
    }
    if ((r.need === 'service' || r.need === 'time') && r.pending) {
      pendingRef.current = r.pending;
      optionsRef.current = r.options ?? r.pending.slotMins?.map(m => {
        const h = Math.floor(m / 60);
        return `${h}:${String(m % 60).padStart(2, '0')}`;
      }) ?? [];
      setPanel({ mode: 'ask', say: r.say, options: r.options, href: r.href });
      speakThenListen(r.say);
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
        speakThenListen(`¿Apunto a ${who} en espera?`);
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
          speakThenListen(preview.say);
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
        speakThenListen(preview.say);
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
          speakThenListen(preview.say);
          return;
        }
        setPanel({
          mode: 'confirm',
          say: preview.say,
          pick: 'cancel',
          choices: preview.matches,
          run: async () => ({ ok: false, say: 'Elige una' }),
        });
        speakThenListen(preview.say);
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
        speakThenListen(preview.say);
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
      missesRef.current = 0;
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
        applyMic('denied');
        return;
      }
      if (ev.error === 'no-speech') {
        window.setTimeout(() => startWakeRef.current(), 700);
        return;
      }
      window.setTimeout(() => startWakeRef.current(), 1100);
    };
    rec.onend = () => {
      if (gen !== genRef.current) return;
      wakeRef.current = false;
      setWakeOn(false);
      if (!wakeWanted(prefsRef.current) || busyRef.current || listenRef.current || speaking || document.hidden || hushRef.current) return;
      window.setTimeout(() => startWakeRef.current(), 800);
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
        applyMic('denied');
        listenRef.current = false;
        overlayRef.current = false;
        killRec();
        restIdle(micBlockedSay());
        return;
      }
      commitListen();
    };
    rec.onend = () => {
      if (gen !== genRef.current) return;
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

  const promptDimeThenListen = (opts?: { overlay?: boolean }) => {
    listenRef.current = false;
    overlayRef.current = false;
    setHearing(false);
    killRec();
    setOpen(true);
    if (!opts?.overlay) setPanel({ mode: 'listen', draft: '' });
    sayDime(() => startListenRef.current(opts));
  };

  const tapMic = (opts?: { overlay?: boolean }) => {
    warmAudio();
    if (hearing) {
      commitListen();
      return;
    }
    const listen = () => startListen(opts);
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
            <button
              type="button"
              onClick={dismiss}
              aria-label="Cerrar"
              className="grid h-11 w-11 place-items-center rounded-icon text-ink-3 transition active:scale-[.96]"
            >
              <X size={18} strokeWidth={2.4} />
            </button>
          </div>
          {panel.mode === 'listen' && (
            <p className="text-body font-semibold text-ink-2">
              {panel.draft || 'Dime.'}
            </p>
          )}
          {panel.mode === 'msg' && (
            <p className="text-body font-semibold text-ink-2">{panel.say}</p>
          )}
          {panel.mode === 'ask' && (
            <div>
              <p className="text-body font-semibold text-ink-2">{panel.say}</p>
              <p className="mt-1 text-label font-semibold text-v-d">
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
              <p className="mt-1 text-label font-semibold text-v-d">
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
                      className="rounded-chip border border-surface-line bg-v-tint px-3 py-2 text-left text-label font-bold text-v-d"
                    >
                      {c.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-chip border border-surface-line py-2 text-label font-bold text-ink-2"
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
                    className="flex-1 rounded-chip border border-surface-line py-2 text-label font-bold text-ink-2"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      const r = await panel.run();
                      finish(r.say, r.href);
                    })}
                    className="flex-1 rounded-chip bg-grad py-2 text-label font-extrabold text-white disabled:opacity-40"
                  >
                    Sí
                  </button>
                </div>
              )}
            </div>
          )}
          {panel.mode === 'idle' && (
            <div className="text-label font-medium leading-snug text-ink-2">
              <p className="font-bold text-ink">Así se usa</p>
              <p className="mt-1">1. «Dime», o toca el micro. En Más se apaga el oído.</p>
              <p>2. Si va a guardar, te pide confirmación.</p>
              <p className="mt-2 text-label text-ink-3">
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
              className="min-w-0 flex-1 rounded-chip border border-surface-line px-3 py-2 text-body font-semibold"
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
          className={`pointer-events-auto grid h-14 w-14 place-items-center rounded-card text-white shadow-btn transition active:scale-[.96] ${
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
      {!open && wakeHeard && (
        <p className="pointer-events-none mt-1 max-w-[200px] text-right text-micro font-semibold text-ink-3">
          Oí «{wakeHeard}»
        </p>
      )}
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
