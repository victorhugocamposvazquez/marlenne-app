'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square } from 'lucide-react';
import {
  voiceAddWait, voiceApplyCancel, voiceApplyMove, voiceApplyStatus, voiceConfirmBook,
  voicePreviewBook, voicePreviewStatus, voiceSlots, voiceToday,
  type PendingBook,
} from '@/app/actions/voice';
import { voiceTalk, type VoiceTalkResult, type VoiceTurn } from '@/app/actions/voice-talk';
import { VOICE_HELP, parseVoice, takeTime } from '@/lib/voice';

type Choice = { id: string; label: string };
type Panel =
  | { mode: 'idle' }
  | { mode: 'listen'; draft: string }
  | { mode: 'msg'; say: string }
  | { mode: 'ask'; say: string; options?: string[]; href?: string }
  | { mode: 'confirm'; say: string; status?: 'curso' | 'noshow'; pick?: 'status' | 'cancel'; run: () => Promise<{ ok: boolean; say: string; href?: string }>; choices?: Choice[] };

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES';
  window.speechSynthesis.speak(u);
}

function makeRec(): {
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
} | null {
  const Ctor = (window as unknown as { SpeechRecognition?: new () => never; webkitSpeechRecognition?: new () => never })
    .SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => never }).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new (Ctor as new () => {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    start: () => void;
    stop: () => void;
    onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
  })();
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
  const recRef = useRef<ReturnType<typeof makeRec>>(null);
  const historyRef = useRef<VoiceTurn[]>([]);
  const pendingRef = useRef<PendingBook | null>(null);
  const [hasMic, setHasMic] = useState(false);

  useEffect(() => {
    setHasMic(!!makeRec());
  }, []);

  const finish = (say: string, href?: string) => {
    speak(say);
    setPanel({ mode: 'msg', say });
    if (href) router.push(href);
    window.setTimeout(() => { setPanel({ mode: 'idle' }); setOpen(false); }, 2800);
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
      speak(r.say);
      return;
    }
    if (r.ready && r.draft && r.move) {
      const draft = r.draft as { id: string; date: string; startMin: number; providerId: string };
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyMove(draft) });
      speak(r.say);
      return;
    }
    if (r.ready && r.draft && !r.move && !r.draft.who) {
      const draft = r.draft as Parameters<typeof voiceConfirmBook>[0];
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceConfirmBook(draft) });
      speak(r.say);
      return;
    }
    if (r.draft && typeof r.draft.who === 'string') {
      const who = r.draft.who;
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceAddWait(who) });
      speak(r.say);
      return;
    }
    if (r.matches?.length === 1 && r.cancel) {
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyCancel(r.matches![0].id) });
      speak(r.say);
      return;
    }
    if (r.matches?.length === 1 && r.status) {
      setPanel({ mode: 'confirm', say: r.say, run: () => voiceApplyStatus(r.matches![0].id, r.status!) });
      speak(r.say);
      return;
    }
    if ((r.need === 'service' || r.need === 'time') && r.pending) {
      pendingRef.current = r.pending;
      setPanel({ mode: 'ask', say: r.say, options: r.options, href: r.href });
      speak(r.say);
      return;
    }
    pendingRef.current = null;
    finish(r.say, r.href);
  };

  const continueBook = async (patch: Partial<PendingBook>) => {
    const p = { ...pendingRef.current!, ...patch };
    const preview = await voicePreviewBook(p.who, p.startMin, p.serviceQ, p.dayOffset, p.providerQ);
    applyTalk(preview);
  };

  const runText = (text: string) => {
    startTransition(async () => {
      const held = pendingRef.current;
      if (held) {
        const cmd = parseVoice(text);
        const isFresh = cmd.kind !== 'unknown' && cmd.kind !== 'help' && cmd.kind !== 'book';
        if (!isFresh) {
          if (held.need === 'time') {
            const clock = takeTime(text).startMin ?? (cmd.kind === 'book' ? cmd.startMin : null);
            if (clock !== null) {
              await continueBook({ startMin: clock });
              return;
            }
          }
          const serviceQ = cmd.kind === 'book' && cmd.serviceQ ? cmd.serviceQ : text.trim();
          await continueBook({ serviceQ });
          return;
        }
        pendingRef.current = null;
      }

      const talked = await voiceTalk(text, historyRef.current);
      if (!talked.fallback) {
        historyRef.current = [
          ...historyRef.current.slice(-4),
          { role: 'user', content: text },
          { role: 'assistant', content: talked.say },
        ];
        applyTalk(talked);
        return;
      }

      const cmd = parseVoice(text);
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
        speak(`¿Pongo a ${who} en espera?`);
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
          speak(preview.say);
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
        speak(preview.say);
        return;
      }
      if (cmd.kind === 'slots') {
        const r = await voiceSlots(cmd.dayOffset, cmd.startMin, cmd.providerQ);
        finish(r.say, r.href);
        return;
      }
      if (cmd.kind === 'book') {
        applyTalk(await voicePreviewBook(cmd.who, cmd.startMin, cmd.serviceQ, cmd.dayOffset, cmd.providerQ));
      }
    });
  };

  const startListen = () => {
    recRef.current?.stop();
    const rec = makeRec();
    if (!rec) {
      setOpen(true);
      setPanel({ mode: 'msg', say: 'Este Safari no dicta. Escribe el comando abajo.' });
      return;
    }
    recRef.current = rec;
    setOpen(true);
    setPanel({ mode: 'listen', draft: '' });
    rec.onresult = ev => {
      const last = ev.results[ev.results.length - 1];
      const text = last?.[0]?.transcript ?? '';
      setPanel({ mode: 'listen', draft: text });
      if (last?.isFinal && text.trim()) {
        rec.stop();
        runText(text);
      }
    };
    rec.onerror = () => setPanel({ mode: 'msg', say: 'No he oído. Escribe el comando o prueba otra vez.' });
    rec.onend = () => {
      setPanel(p => (p.mode === 'listen' && !p.draft ? { mode: 'idle' } : p));
    };
    rec.start();
  };

  const stopListen = () => {
    recRef.current?.stop();
    setPanel(p => (p.mode === 'listen' && p.draft ? p : { mode: 'idle' }));
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end px-3">
      {open && (
        <div className="pointer-events-auto mb-2 w-full max-w-[360px] rounded-[18px] border border-surface-line bg-white p-3 shadow-toast">
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
              {panel.options && panel.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {panel.options.map(opt => (
                    <button
                      key={opt}
                      disabled={pending}
                      onClick={() => startTransition(async () => {
                        await continueBook({ serviceQ: opt });
                      })}
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
                </div>
              )}
              {!panel.choices && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => { setPanel({ mode: 'idle' }); setOpen(false); }}
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
              <p className="mt-1">1. Toca otra vez el micro para hablar, o escribe abajo.</p>
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
      <button
        type="button"
        aria-label={panel.mode === 'listen' ? 'Dejar de escuchar' : 'Hablar con Marlenne'}
        aria-pressed={panel.mode === 'listen'}
        onClick={() => {
          if (panel.mode === 'listen') stopListen();
          else if (!open) { setOpen(true); setPanel({ mode: 'idle' }); }
          else startListen();
        }}
        className={`pointer-events-auto grid h-14 w-14 place-items-center rounded-[18px] text-white shadow-btn ${
          panel.mode === 'listen' ? 'bg-pink-600' : 'bg-grad'
        }`}
      >
        {panel.mode === 'listen' ? <Square size={20} strokeWidth={2.4} /> : <Mic size={22} strokeWidth={2.2} />}
      </button>
      {!hasMic && open && (
        <p className="pointer-events-none mt-1 text-right text-[10.5px] font-semibold text-ink-3">
          Sin dictado en este navegador
        </p>
      )}
    </div>
  );
}
