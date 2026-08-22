'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square } from 'lucide-react';
import {
  voiceAddWait, voiceApplyStatus, voiceConfirmBook, voicePreviewBook,
  voicePreviewStatus, voiceToday,
} from '@/app/actions/voice';
import { VOICE_HELP, parseVoice } from '@/lib/voice';

type Choice = { id: string; label: string };
type Panel =
  | { mode: 'idle' }
  | { mode: 'listen'; draft: string }
  | { mode: 'msg'; say: string }
  | { mode: 'confirm'; say: string; status?: 'curso' | 'noshow'; run: () => Promise<{ ok: boolean; say: string; href?: string }>; choices?: Choice[] };

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

  const runText = (text: string) => {
    const cmd = parseVoice(text);
    startTransition(async () => {
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
          choices: preview.matches,
          run: async () => ({ ok: false, say: 'Elige una' }),
        });
        speak(preview.say);
        return;
      }
      if (cmd.kind === 'book') {
        const preview = await voicePreviewBook(cmd.who, cmd.startMin, cmd.serviceQ);
        if (!preview.ready) {
          finish(preview.say, preview.href);
          return;
        }
        const draft = preview.draft!;
        setPanel({
          mode: 'confirm',
          say: preview.say,
          run: () => voiceConfirmBook(draft),
        });
        speak(preview.say);
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
              {panel.draft || 'Habla… «qué hay hoy», «pasa Lucía»'}
            </p>
          )}
          {panel.mode === 'msg' && (
            <p className="text-[13px] font-semibold text-ink-2">{panel.say}</p>
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
                        const status = panel.status ?? 'noshow';
                        const r = await voiceApplyStatus(c.id, status);
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
            <p className="text-[12px] font-medium text-ink-3">{VOICE_HELP}</p>
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
              placeholder="O escribe el comando"
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
