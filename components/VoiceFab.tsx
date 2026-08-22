'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, X } from 'lucide-react';
import {
  voiceAddWait, voiceApplyCancel, voiceApplyMove, voiceApplyStatus, voiceConfirmBook,
  voicePreviewBook, voicePreviewCancel, voicePreviewMove, voicePreviewStatus, voiceSlots, voiceToday,
  type PendingBook,
} from '@/app/actions/voice';
import type { VoiceTalkResult } from '@/app/actions/voice-talk';
import { VOICE_HELP, fold, isVoiceYes, parseVoice, splitWake, takeTime } from '@/lib/voice';

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

function speak(text: string, onDone?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onDone?.();
    return;
  }
  window.clearTimeout(speakTimer);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onDone?.();
  };
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickWomanVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = 'es-ES';
  }
  u.pitch = 1;
  u.rate = 0.92;
  u.onend = finish;
  u.onerror = finish;
  speakTimer = window.setTimeout(() => {
    try { window.speechSynthesis.cancel(); } catch { /* */ }
    window.speechSynthesis.speak(u);
    if (onDone) window.setTimeout(finish, Math.min(8000, 800 + text.length * 70));
  }, 120);
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
  const commitRef = useRef<() => void>(() => {});
  const [hearDraft, setHearDraft] = useState('');
  const [hearing, setHearing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);
  const [wakeHeard, setWakeHeard] = useState('');
  const armedRef = useRef(false);
  const hushRef = useRef(false);
  const wakeRef = useRef(false);
  const startWakeRef = useRef<() => void>(() => {});
  const ignoreOutsideRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasMic, setHasMic] = useState(false);

  const arm = () => {
    if (hushRef.current) return;
    armedRef.current = true;
    setArmed(true);
    try { localStorage.setItem('marlenne-wake', '1'); } catch { /* */ }
  };

  const hush = () => {
    hushRef.current = true;
    armedRef.current = false;
    setArmed(false);
    setWakeOn(false);
    wakeRef.current = false;
    genRef.current += 1;
    killRec();
    try { localStorage.setItem('marlenne-wake', '0'); } catch { /* */ }
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
    try { window.speechSynthesis?.cancel(); } catch { /* */ }
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
    try {
      if (localStorage.getItem('marlenne-wake') === '0') hushRef.current = true;
    } catch { /* */ }
    if (!hushRef.current) {
      arm();
      window.setTimeout(() => startWakeRef.current(), 400);
    }
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
    };
  }, []);

  useEffect(() => {
    if (!wakeHeard) return;
    const t = window.setTimeout(() => setWakeHeard(''), 4000);
    return () => window.clearTimeout(t);
  }, [wakeHeard]);

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
      if (held) {
        const isFresh = cmd.kind !== 'unknown' && cmd.kind !== 'help' && cmd.kind !== 'book';
        if (!isFresh) {
          if (held.need === 'time') {
            const clock = takeTime(text).startMin ?? (cmd.kind === 'book' ? cmd.startMin : null);
            if (clock !== null) {
              await continueBook({ startMin: clock });
              return;
            }
          }
          const serviceQ = cmd.kind === 'book' && cmd.serviceQ
            ? cmd.serviceQ
            : text.trim().replace(/^(pues |mira |vale |una |un |de |el |la |le hacemos |hacemos )/i, '').trim();
          await continueBook({ serviceQ });
          return;
        }
        pendingRef.current = null;
      }

      if (cmd.kind === 'help' || cmd.kind === 'unknown') {
        const say = cmd.kind === 'unknown'
          ? `No he pillado «${cmd.text}». Prueba: ${VOICE_HELP}`
          : `Puedo: ${VOICE_HELP}`;
        speak(say);
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
          say: `¿Pongo a ${who} en espera?`,
          run: () => voiceAddWait(who),
        });
        speak(`¿Pongo a ${who} en espera? Di sí o no.`, () => startListen({ overlay: true }));
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
      if (wake.woke && !wake.rest) {
        speak('Dime.', () => startListen(overlay ? { overlay: true } : undefined));
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
    if (hushRef.current || document.hidden) return;
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
      unlockSpeak();
      if (isCmd && !wake.woke) {
        setOpen(true);
        runText(heard);
        return;
      }
      if (wake.rest.length >= 4) {
        setOpen(true);
        setPanel({ mode: 'listen', draft: wake.rest });
        runText(wake.rest);
        return;
      }
      startListen();
      window.setTimeout(() => speak('Dime.'), 250);
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
      if (!armedRef.current || listenRef.current || document.hidden || hushRef.current) return;
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
    hushRef.current = false;
    arm();
    wakeRef.current = false;
    setWakeOn(false);
    const gen = ++genRef.current;
    draftRef.current = '';
    listenRef.current = true;
    overlayRef.current = !!opts?.overlay;
    setHearing(true);
    setHearDraft('');
    unlockSpeak();
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
              {panel.draft || 'Te escucho. Suelta al terminar.'}
            </p>
          )}
          {panel.mode === 'msg' && (
            <p className="text-[13px] font-semibold text-ink-2">{panel.say}</p>
          )}
          {panel.mode === 'ask' && (
            <div>
              <p className="text-[13px] font-semibold text-ink-2">{panel.say}</p>
              <p className="mt-1 text-[12px] font-semibold text-v-d">
                {hearDraft || (hearing ? 'Dilo: vacumterapia, facial…' : 'Toca el micro y dilo, o elige abajo.')}
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
              <p className="mt-1">1. Di «Hola Marlenne» o toca el micro. Responde «Dime».</p>
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
