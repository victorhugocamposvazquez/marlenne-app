"use client";

/**
 * Chat de Marlén — panel.
 * Sin dependencias (solo React). Estilos inline con los tokens de marlén.
 * El panel no sabe nada del negocio: pinta los bloques que devuelve `api`.
 * Reglas de conversación: chat-marlen.md. Diseño y comportamiento: chat-marlen-ui.md.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ─────────────────────────── Tokens ─────────────────────────── */

export const T = {
  ink: "#0F0E1A",
  ink2: "#4A4758",
  mute: "#6E6B7B",
  faint: "#9A97A8",
  line: "#E6E5EC",
  surface: "#FFFFFF",
  surface2: "#F7F7FA",
  surface3: "#F2F2F7",
  behind: "#DDDCE4",
  brandA: "#d000a8",
  brandB: "#0879ff",
  assumedBg: "#FDF0FA",
  assumedFg: "#B0088E",
  okBg: "#E7F7EE",
  ok: "#0B7A40",
  okFg: "#0B4F2B",
  badBg: "#FFF1F4",
  bad: "#B3123B",
  badFg: "#7A0C28",
} as const;

export const GRAD = `linear-gradient(135deg, ${T.brandA}, ${T.brandB})`;

/* ─────────────────────────── Tipos ─────────────────────────── */

export type FieldId =
  | "clienta" | "servicio" | "dia" | "hora" | "profesional"
  | "pago" | "importe" | "medio" | "texto" | "otra_clienta";

export type IconName = "cita" | "hoy" | "cobrar" | "tareas" | "whatsapp" | "cabina" | "cerrar" | "espera";

export type Option = { id: string; label: string; hint?: string };
export type PersonOption = { id: string; name: string; tail?: string; lastVisit?: string };

/** Horas en "HH:mm", hora local del centro. Día en "YYYY-MM-DD". */
export type Slot = { day: string; start: string; end: string; professionalId: string };
export type DayStrip = { open: string; close: string; step: number; busy: { start: string; end: string }[] };

export type SlotsPicker = {
  type: "slots";
  day: string;
  dayLabel: string;
  closed?: boolean;
  durationMin: number;
  suggested: Slot[];
  more: Slot[];
  strip: DayStrip;
  professionals?: Option[];
  professionalId?: string;
  nearest?: { label: string; slot: Slot };
};

export type Picker =
  | { type: "chips"; options: Option[] }
  | { type: "people"; options: PersonOption[]; allowNew: boolean }
  | SlotsPicker
  | { type: "amount"; value: number }
  | { type: "text"; value: string }
  | { type: "none" };

export type ActionSend = string | { intent: string; args?: Record<string, unknown> };
export type Action = { id: string; label: string; icon?: IconName; send: ActionSend };

export type Ghost = {
  kind: "new" | "move" | "block";
  day: string;
  professionalId: string;
  start: string;
  end: string;
  label: string;
  from?: { day: string; professionalId: string; start: string; end: string };
  conflictWith?: string[];
};

export type ProposalField = {
  id: FieldId;
  label: string;
  value: string;
  note?: string;
  /** Lo supuso Marlén. Se pinta como marca rosa. */
  assumed?: string;
  editable: boolean;
  picker?: Picker;
};

export type Proposal = {
  previewId: string;
  expiresAt: string;
  intent: string;
  heading: string;
  title: string;
  /** Qué se abre al tocar el título (día y hora). */
  titlePicker?: SlotsPicker;
  fields: ProposalField[];
  question: string;
  yesLabel?: string;
  ghost?: Ghost;
};

export type PayMethod = "efectivo" | "tarjeta" | "bizum" | "transferencia" | "pendiente";
export type ChargeLine = { amount: number; method?: PayMethod };

export type Checkout = {
  previewId: string;
  expiresAt: string;
  appointment: { id: string; clienta: string; service: string; when: string; professional: string };
  close: { note?: string };
  charge: { on: boolean; available: boolean; price: number; lines: ChargeLine[]; reason?: string };
  next: { on: boolean; weeks?: number; label?: string; assumed?: string; picker?: SlotsPicker };
  whatsapp: { on: boolean; available: boolean };
  question: string;
  ghost?: Ghost;
};

export type Row = {
  id: string;
  title: string;
  detail?: string;
  value?: string;
  action?: Action;
  /** La acción se guarda directa y la fila se actualiza en el sitio. */
  inline?: boolean;
};

/** Texto con variables: { v } va en negrita y subrayado punteado. */
export type RichPart = string | { v: string };

export type ErrorCode = "offline" | "expired" | "conflict" | "role_admin" | "role_cabina" | "not_understood";

export type Block =
  | { kind: "text"; text: string; size?: "md" | "lg"; tone?: "mute" }
  | { kind: "ask"; question: string; field: FieldId; picker: Picker; context?: string[] }
  | { kind: "proposal"; proposal: Proposal }
  | { kind: "checkout"; checkout: Checkout }
  | { kind: "saved"; title: string; summary: string; next: Action[]; undoId?: string }
  | { kind: "instant"; text: string; undoId: string; next?: Action[] }
  | { kind: "list"; title: string; rows: Row[]; empty?: string; openIn?: { label: string; href: string } }
  | { kind: "total"; title: string; amount: string; lines: { label: string; value: string }[] }
  | { kind: "preview"; previewId: string; label: string; body: RichPart[]; note?: string; chips: Action[]; question: string }
  | { kind: "alert"; text: string; action: Action }
  | { kind: "error"; code: ErrorCode; text: string; actions: Action[] };

export type StartRow = { id: string; label: string; detail?: string; now?: boolean; icon?: IconName; send: ActionSend };
export type ScreenContext = { route: string; title: string; citaId?: string; clientaId?: string };
export type Fixed = { id: string; name: string } | null;
export type TurnResult = { blocks: Block[]; fixed?: Fixed };
export type PreviewPatch = { field: string; value: unknown };

export interface ChatApi {
  start(ctx: ScreenContext): Promise<{ rows: StartRow[]; examples: string[] }>;
  /** `uttered` es lo que se muestra / dijo la persona (chips, mic, teclado). */
  turn(input: ActionSend, ctx: ScreenContext, fixed: Fixed, uttered?: string): Promise<TurnResult>;
  /** Cambia un dato de la propuesta o de la tarjeta de salida. Devuelve el bloque entero, recomprobado. */
  patchPreview(previewId: string, patch: PreviewPatch): Promise<Block>;
  confirm(previewId: string): Promise<TurnResult>;
  cancel(previewId: string): Promise<void>;
  undo(undoId: string): Promise<TurnResult>;
}

export type VoicePartial = { text: string; understood: string[]; missing?: string };
export interface VoiceAdapter {
  /** Devuelve la función para parar. */
  start(onPartial: (p: VoicePartial) => void, onFinal: (text: string) => void): () => void;
}

export type MarlenChatProps = {
  open: boolean;
  onClose: () => void;
  api: ChatApi;
  screen: ScreenContext;
  voice?: VoiceAdapter;
  /** La propuesta viva lleva (o deja de llevar) una cita fantasma. La agenda la pinta. */
  onGhost?: (ghost: Ghost | null) => void;
  /** Abrir una ruta debajo; el panel no se cierra. */
  onNavigate?: (href: string) => void;
};

/* ─────────────────────────── Utilidades ─────────────────────────── */

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const euros = (n: number) =>
  `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const ORDINALS = ["la primera", "la segunda", "la tercera"];
const METHODS: { id: PayMethod; label: string }[] = [
  { id: "efectivo", label: "Efectivo" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "bizum", label: "Bizum" },
  { id: "pendiente", label: "Pendiente" },
];

function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

let seq = 0;
const uid = () => `m${++seq}`;

/* ─────────────────────────── Estilos compartidos ─────────────────────────── */

const CSS = `
@keyframes mc-sheet { from { transform: translateY(24px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes mc-in { from { transform: translateY(8px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes mc-flash { 0% { background: ${T.assumedBg} } 100% { background: transparent } }
@keyframes mc-ring { from { stroke-dashoffset: 0 } to { stroke-dashoffset: 50.3 } }
@keyframes mc-dot { 0%, 80%, 100% { opacity: .25 } 40% { opacity: 1 } }
@keyframes mc-spin { to { transform: rotate(360deg) } }
.mc-sheet { animation: mc-sheet 220ms cubic-bezier(.2,.8,.2,1) }
.mc-in { animation: mc-in 160ms ease-out }
.mc-flash { animation: mc-flash 400ms ease-out }
.mc button { font-family: inherit; cursor: pointer }
.mc button:disabled { cursor: default; opacity: .5 }
.mc button:focus-visible, .mc input:focus-visible, .mc a:focus-visible { outline: 2px solid ${T.brandB}; outline-offset: 2px }
.mc input { font-family: inherit }
.mc ::-webkit-scrollbar { display: none }
@media (prefers-reduced-motion: reduce) {
  .mc-sheet, .mc-in { animation: none }
}
`;

const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: T.mute };
const question: React.CSSProperties = { margin: 0, fontSize: 22, lineHeight: 1.25, fontWeight: 700, letterSpacing: "-0.01em" };
const card: React.CSSProperties = { border: `1px solid ${T.line}`, borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", gap: 14, background: T.surface };
const chip: React.CSSProperties = { minHeight: 44, borderRadius: 99, border: `1px solid ${T.line}`, background: T.surface, padding: "0 16px", fontSize: 14, color: T.ink };
const chipOn: React.CSSProperties = { ...chip, background: T.ink, color: "#FFFFFF", border: `1px solid ${T.ink}`, fontWeight: 600 };
const btnYes: React.CSSProperties = { flex: 2, height: 56, borderRadius: 99, border: "none", background: T.ink, color: "#FFFFFF", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
const btnNo: React.CSSProperties = { flex: 1, height: 56, borderRadius: 99, border: "none", background: T.surface3, color: T.ink, fontSize: 15, fontWeight: 600 };
const round44: React.CSSProperties = { width: 44, height: 44, flex: "0 0 auto", borderRadius: 99, border: "none", background: T.surface3, display: "flex", alignItems: "center", justifyContent: "center" };
const assumedTag: React.CSSProperties = { minHeight: 24, borderRadius: 99, background: T.assumedBg, color: T.assumedFg, padding: "0 10px", display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" };

/* ─────────────────────────── Iconos ─────────────────────────── */

const ICONS: Record<IconName | "x" | "mic" | "send" | "check" | "chev" | "left" | "right" | "offline" | "stop", React.ReactNode> = {
  cita: (<><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3M12 12.5v5M9.5 15h5" /></>),
  hoy: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  cobrar: (<><rect x="3" y="6" width="18" height="12.5" rx="3" /><path d="M3 10.5h18M7 15h3" /></>),
  tareas: <path d="M4 7l2 2 3.5-3.5M4 15.5l2 2 3.5-3.5M13 7.5h7M13 16h7" />,
  whatsapp: <path d="M4 19.5l1.4-4A8 8 0 1 1 8.6 18.7L4 19.5Z" />,
  cabina: <path d="M5 12h12M12 6.5l5.5 5.5-5.5 5.5" />,
  cerrar: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  espera: (<><circle cx="12" cy="12" r="8.5" /><path d="M9 9.5v5M15 9.5v5" /></>),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  mic: (<><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></>),
  send: <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chev: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  left: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  right: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  offline: <path d="M4 9.5a12 12 0 0 1 16 0M7 13a7.5 7.5 0 0 1 10 0M12 17.5h.01M4 4l16 16" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" stroke="none" />,
};

function Icon({ name, size = 20, color = T.ink, width = 2 }: { name: keyof typeof ICONS; size?: number; color?: string; width?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={{ color, flex: "0 0 auto" }}>
      {ICONS[name]}
    </svg>
  );
}

function Spinner() {
  return <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 99, border: "2.5px solid rgba(255,255,255,.35)", borderTopColor: "#FFFFFF", animation: "mc-spin 700ms linear infinite" }} />;
}

/* ─────────────────────────── Selector de huecos (mejora 6) ─────────────────────────── */

export type SlotAnswer =
  | { type: "slot"; slot: Slot }
  | { type: "day"; delta: number }
  | { type: "professional"; id: string }
  | { type: "other-day" }
  | { type: "wait" };

function SlotPickerView({ picker, onAnswer, disabled, footer = true }: { picker: SlotsPicker; onAnswer: (a: SlotAnswer, said: string) => void; disabled?: boolean; footer?: boolean }) {
  const [more, setMore] = useState(false);
  const [mark, setMark] = useState<number | null>(null);
  const { strip, durationMin } = picker;
  const open = toMin(strip.open);
  const close = toMin(strip.close);
  const span = close - open;

  useEffect(() => { setMark(null); setMore(false); }, [picker.day, picker.professionalId]);

  const isFree = (s: number) =>
    s >= open && s + durationMin <= close &&
    !strip.busy.some((b) => s < toMin(b.end) && s + durationMin > toMin(b.start));

  const onStrip = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || picker.closed) return;
    const r = e.currentTarget.getBoundingClientRect();
    const raw = open + ((e.clientX - r.left) / r.width) * span - durationMin / 2;
    const snapped = Math.round(raw / strip.step) * strip.step;
    if (isFree(snapped)) setMark(snapped);
  };

  const hours: number[] = [];
  for (let h = Math.ceil(open / 60); h * 60 <= close; h += 2) hours.push(h);

  const pick = (slot: Slot) => onAnswer({ type: "slot", slot }, slot.start);
  const proId = picker.professionalId ?? picker.suggested[0]?.professionalId ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button aria-label="Día anterior" disabled={disabled} onClick={() => onAnswer({ type: "day", delta: -1 }, "el día anterior")} style={round44}><Icon name="left" size={18} /></button>
        <span style={{ fontSize: 15, fontWeight: 600, color: picker.closed ? T.mute : T.ink, flex: 1, textAlign: "center" }}>
          {picker.dayLabel}{picker.closed ? ", cerrado" : ""}
        </span>
        <button aria-label="Día siguiente" disabled={disabled} onClick={() => onAnswer({ type: "day", delta: 1 }, "el día siguiente")} style={round44}><Icon name="right" size={18} /></button>
      </div>

      {picker.professionals && picker.professionals.length > 1 && (
        <div role="group" aria-label="Con quién" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {picker.professionals.map((p) => (
            <button key={p.id} disabled={disabled} aria-pressed={p.id === picker.professionalId} onClick={() => onAnswer({ type: "professional", id: p.id }, `con ${p.label}`)} style={{ ...(p.id === picker.professionalId ? chipOn : chip), padding: "0 14px" }}>{p.label}</button>
          ))}
        </div>
      )}

      {picker.suggested.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${picker.suggested.length}, minmax(0, 1fr))`, gap: 10 }}>
          {picker.suggested.map((s, i) => (
            <button key={s.start} disabled={disabled} onClick={() => pick(s)} style={{ height: 76, borderRadius: 18, border: "none", background: T.surface3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: T.ink }}>
              <span style={{ fontSize: 20, fontWeight: 700 }}>{s.start}</span>
              {picker.suggested.length <= 3 && <span style={{ fontSize: 12, color: T.ink2 }}>{ORDINALS[i]}</span>}
            </button>
          ))}
        </div>
      )}

      {picker.suggested.length === 0 && !picker.closed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 15, color: T.mute }}>Ese día no hay hueco.</p>
          {picker.nearest && (
            <button disabled={disabled} onClick={() => pick(picker.nearest!.slot)} style={{ ...chip, alignSelf: "flex-start", fontWeight: 600 }}>{picker.nearest.label}</button>
          )}
        </div>
      )}

      {!picker.closed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ position: "relative", height: 16 }}>
              {hours.map((h) => (
                <span key={h} style={{ position: "absolute", left: `${((h * 60 - open) / span) * 100}%`, transform: "translateX(-50%)", fontSize: 11, fontWeight: 600, color: T.mute }}>{h}</span>
              ))}
            </div>
            <div onPointerDown={onStrip} onPointerMove={(e) => e.buttons === 1 && onStrip(e)} style={{ position: "relative", height: 40, borderRadius: 10, border: `1px solid ${T.line}`, background: T.surface, overflow: "hidden", touchAction: "none", cursor: disabled ? "default" : "pointer" }}>
              {strip.busy.map((b) => (
                <div key={b.start} style={{ position: "absolute", top: 0, bottom: 0, left: `${((toMin(b.start) - open) / span) * 100}%`, width: `${((toMin(b.end) - toMin(b.start)) / span) * 100}%`, background: T.line }} />
              ))}
              {mark !== null && (
                <div style={{ position: "absolute", top: 3, bottom: 3, left: `${((mark - open) / span) * 100}%`, width: `${(durationMin / span) * 100}%`, borderRadius: 7, background: GRAD }} />
              )}
            </div>
          </div>
          {mark !== null && (
            <button disabled={disabled} onClick={() => pick({ day: picker.day, start: fromMin(mark), end: fromMin(mark + durationMin), professionalId: proId })} style={{ ...chipOn, alignSelf: "flex-start" }}>
              {fromMin(mark)}–{fromMin(mark + durationMin)} · Elegir
            </button>
          )}
        </div>
      )}

      {picker.more.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button aria-expanded={more} onClick={() => setMore((v) => !v)} style={{ alignSelf: "flex-start", minHeight: 44, border: "none", background: "transparent", padding: "0 4px", fontSize: 14, fontWeight: 600, color: T.ink, textDecoration: "underline" }}>
            {more ? "Menos huecos" : "Más huecos"}
          </button>
          {more && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {picker.more.map((s) => (
                <button key={s.start} disabled={disabled} onClick={() => pick(s)} style={{ ...chip, padding: 0, fontWeight: 600 }}>{s.start}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {footer && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button disabled={disabled} onClick={() => onAnswer({ type: "other-day" }, "Otro día")} style={chip}>Otro día</button>
          <button disabled={disabled} onClick={() => onAnswer({ type: "wait" }, "Ponla en espera")} style={chip}>Ponla en espera</button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Selector genérico ─────────────────────────── */

function PickerView({ picker, onPick, disabled, footer }: { picker: Picker; onPick: (value: unknown, said: string) => void; disabled?: boolean; footer?: boolean }) {
  const [draft, setDraft] = useState(picker.type === "amount" ? String(picker.value).replace(".", ",") : picker.type === "text" ? picker.value : "");

  if (picker.type === "slots") {
    return <SlotPickerView picker={picker} disabled={disabled} footer={footer} onAnswer={(a, said) => onPick(a, said)} />;
  }
  if (picker.type === "chips") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {picker.options.map((o) => (
          <button key={o.id} disabled={disabled} onClick={() => onPick(o.id, o.label)} style={{ ...chip, fontWeight: 600 }}>
            {o.label}{o.hint ? <span style={{ fontWeight: 400, color: T.mute }}> · {o.hint}</span> : null}
          </button>
        ))}
      </div>
    );
  }
  if (picker.type === "people") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {picker.options.map((p, i) => (
          <button key={p.id} disabled={disabled} onClick={() => onPick(p.id, p.tail ? `${p.name}, ${p.tail}` : p.name)} style={{ borderRadius: 18, border: `1px solid ${T.line}`, background: T.surface, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, color: T.ink, textAlign: "left" }}>
            <span style={{ ...round44, fontSize: 15, fontWeight: 700 }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 17, fontWeight: 600 }}>{p.name}{p.tail ? <span style={{ fontWeight: 400, color: T.mute }}> · {p.tail}</span> : null}</span>
              {p.lastVisit && <span style={{ fontSize: 13, color: T.mute }}>{p.lastVisit}</span>}
            </span>
          </button>
        ))}
        {picker.allowNew && (
          <button disabled={disabled} onClick={() => onPick("new", "Ninguna, es nueva")} style={{ minHeight: 48, borderRadius: 99, border: `1px dashed ${T.faint}`, background: T.surface, padding: "0 16px", fontSize: 15, fontWeight: 600, color: T.ink }}>Ninguna, es nueva</button>
        )}
      </div>
    );
  }
  if (picker.type === "amount" || picker.type === "text") {
    const isAmount = picker.type === "amount";
    const submit = () => {
      if (isAmount) {
        const n = Number(draft.replace(",", "."));
        if (Number.isFinite(n) && n >= 0) onPick(n, euros(n));
      } else if (draft.trim()) onPick(draft.trim(), draft.trim());
    };
    return (
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "flex", gap: 8 }}>
        <input aria-label={isAmount ? "Importe" : "Texto"} autoFocus inputMode={isAmount ? "decimal" : "text"} value={draft} disabled={disabled} onChange={(e) => setDraft(e.target.value)} style={{ flex: 1, minWidth: 0, height: 48, boxSizing: "border-box", borderRadius: 14, border: `1px solid ${T.line}`, background: T.surface, padding: "0 14px", fontSize: 17, fontWeight: 600, color: T.ink }} />
        <button type="submit" disabled={disabled} style={{ ...chipOn, minHeight: 48 }}>Vale</button>
      </form>
    );
  }
  return null;
}

/* ─────────────────────────── Propuesta editable (mejora 1) ─────────────────────────── */

function YesNo({ question: q, yesLabel = "Sí", canYes = true, hint, saving, onYes, onNo, yesRef }: { question: string; yesLabel?: string; canYes?: boolean; hint?: string; saving: boolean; onYes: () => void; onNo: () => void; yesRef?: React.Ref<HTMLButtonElement> }) {
  return (
    <div style={{ position: "sticky", bottom: 0, zIndex: 1, background: T.surface, margin: "0 -20px", padding: "12px 20px 4px", display: "flex", flexDirection: "column", gap: 12, boxShadow: `0 -12px 12px -12px rgba(15,14,26,.12)` }}>
      <p style={question}>{q}</p>
      {hint && <p role="status" style={{ margin: 0, fontSize: 14, color: T.mute }}>{hint}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button ref={yesRef} disabled={saving || !canYes} onClick={onYes} style={btnYes}>{saving ? <Spinner /> : yesLabel}</button>
        <button disabled={saving} onClick={onNo} style={btnNo}>No</button>
      </div>
    </div>
  );
}

function ProposalCard({ proposal, saving, patching, onPatch, onYes, onNo, canSeeAgenda, onSeeAgenda }: {
  proposal: Proposal; saving: boolean; patching: string | null;
  onPatch: (patch: PreviewPatch) => void; onYes: () => void; onNo: () => void;
  canSeeAgenda: boolean; onSeeAgenda?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const prev = useRef(proposal);

  useEffect(() => {
    const tag = document.activeElement?.tagName;
    if (tag !== "INPUT" && tag !== "TEXTAREA") yesRef.current?.focus({ preventScroll: true });
  }, []);

  // Parpadeo del dato que ha cambiado.
  useEffect(() => {
    const before = prev.current;
    if (before.previewId !== proposal.previewId) {
      if (before.title !== proposal.title) setFlash("title");
      else {
        const changed = proposal.fields.find((f, i) => before.fields[i]?.value !== f.value);
        if (changed) setFlash(changed.id);
      }
      prev.current = proposal;
    }
  }, [proposal]);

  const slotPatch = (value: unknown) => {
    const a = value as SlotAnswer;
    if (a.type === "slot") { onPatch({ field: "hora", value: a.slot }); setOpenId(null); }
    else if (a.type === "day") onPatch({ field: "dia", value: a.delta });
    else if (a.type === "professional") onPatch({ field: "profesional", value: a.id });
  };

  const row = (id: string, editable: boolean, open: boolean, head: React.ReactNode, picker: Picker | undefined, onPick: (value: unknown) => void) => (
    <div key={id} className={flash === id ? "mc-flash" : undefined} onAnimationEnd={() => setFlash(null)} style={{ borderRadius: 12, margin: "0 -6px", padding: "0 6px" }}>
      {editable ? (
        <button aria-expanded={open} disabled={saving} onClick={() => setOpenId(open ? null : id)} style={{ width: "100%", minHeight: 48, border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 12, color: T.ink, textAlign: "left", opacity: patching === id ? 0.5 : 1 }}>
          {head}
          <span style={{ flex: 1 }} />
          <span style={{ transform: open ? "rotate(90deg)" : "none", display: "flex" }}><Icon name="chev" size={16} color={T.mute} /></span>
        </button>
      ) : (
        <div style={{ minHeight: 48, display: "flex", alignItems: "center", gap: 12 }}>{head}</div>
      )}
      {open && picker && (
        <div className="mc-in" style={{ padding: "6px 0 14px" }}>
          <PickerView picker={picker} disabled={saving || patching !== null} footer={false} onPick={(v) => onPick(v)} />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} onKeyDown={(e) => { if (e.key === "Escape" && openId) { e.stopPropagation(); setOpenId(null); } }}>
      <div style={card}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={label}>{proposal.heading}</span>
          {row("title", Boolean(proposal.titlePicker), openId === "title",
            <span style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.02em" }}>{proposal.title}</span>,
            proposal.titlePicker, slotPatch)}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {proposal.fields.map((f) =>
            row(f.id, f.editable && Boolean(f.picker), openId === f.id,
              <>
                <span style={{ width: 64, flex: "0 0 auto", fontSize: 13, color: T.mute }}>{f.label}</span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{f.value}{f.note ? <span style={{ fontWeight: 400, color: T.mute }}> {f.note}</span> : null}</span>
                {f.assumed && <span style={assumedTag}>{f.assumed}</span>}
              </>,
              f.picker,
              (v) => {
                if (f.picker?.type === "slots") slotPatch(v);
                else { onPatch({ field: f.id, value: v }); setOpenId(null); }
              }),
          )}
        </div>
        {proposal.ghost?.conflictWith?.length ? (
          <p role="status" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.bad }}>Se pisa con otra cita a esa hora.</p>
        ) : null}
        {proposal.ghost && !canSeeAgenda && onSeeAgenda && (
          <button onClick={onSeeAgenda} style={{ alignSelf: "flex-start", minHeight: 44, border: "none", background: "transparent", padding: 0, fontSize: 14, fontWeight: 600, color: T.ink, textDecoration: "underline" }}>Ver en la agenda</button>
        )}
      </div>
      <YesNo question={proposal.question} yesLabel={proposal.yesLabel} saving={saving} canYes={patching === null} onYes={onYes} onNo={onNo} yesRef={yesRef} />
    </div>
  );
}

/* ─────────────────────────── Tarjeta de salida (mejora 2) ─────────────────────────── */

function Toggle({ on, onChange, label: text, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={on} aria-label={text} disabled={disabled} onClick={() => onChange(!on)} style={{ width: 44, height: 44, flex: "0 0 auto", border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ width: 40, height: 24, borderRadius: 99, background: on ? T.ink : T.faint, position: "relative", transition: "background 120ms" }}>
        <span style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: 99, background: "#FFFFFF", transition: "left 120ms" }} />
      </span>
    </button>
  );
}

function CheckoutCard({ checkout: c, saving, patching, onPatch, onYes, onNo }: {
  checkout: Checkout; saving: boolean; patching: string | null;
  onPatch: (patch: PreviewPatch) => void; onYes: () => void; onNo: () => void;
}) {
  const [editAmount, setEditAmount] = useState(false);
  const [openSlot, setOpenSlot] = useState(false);
  const busy = saving || patching !== null;
  const section: React.CSSProperties = { background: T.surface2, borderRadius: 16, padding: "8px 14px 8px 6px", display: "flex", flexDirection: "column", gap: 10 };
  const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, minHeight: 44 };

  const total = c.charge.lines.reduce((s, l) => s + l.amount, 0);
  const missingMethod = c.charge.on && c.charge.lines.some((l) => !l.method);
  const count = 1 + (c.charge.on ? 1 : 0) + (c.next.on && c.next.label ? 1 : 0);
  const nextIncomplete = c.next.on && !c.next.label;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={card}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={label}>La cita en curso</span>
          <span style={{ fontSize: 22, lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.01em" }}>{c.appointment.clienta} · {c.appointment.service}</span>
          <span style={{ fontSize: 14, color: T.mute }}>{c.appointment.when} · con {c.appointment.professional}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ ...section, padding: "8px 14px" }}>
            <div style={{ ...head, gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: 99, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={16} color="#FFFFFF" width={2.6} /></span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Cerrar la cita</span>
            </div>
            {c.close.note && <span style={{ fontSize: 13, color: T.ink2, paddingBottom: 6 }}>{c.close.note}</span>}
          </div>

          <div style={c.charge.available ? section : { ...section, padding: "8px 14px" }}>
            {c.charge.available ? (
              <>
                <div style={head}>
                  <Toggle on={c.charge.on} disabled={busy} label="Cobrar" onChange={(v) => onPatch({ field: "charge.on", value: v })} />
                  <span style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>Cobrar</span>
                  {c.charge.on && (
                    <button disabled={busy} aria-expanded={editAmount} onClick={() => setEditAmount((v) => !v)} style={{ minHeight: 44, border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 17, fontWeight: 700, color: T.ink }}>
                      {euros(total)}<Icon name="chev" size={16} color={T.mute} />
                    </button>
                  )}
                </div>
                {c.charge.on && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 0 8px 8px" }}>
                    {editAmount && (
                      <PickerView picker={{ type: "amount", value: total }} disabled={busy} onPick={(v) => { onPatch({ field: "charge.amount", value: v }); setEditAmount(false); }} />
                    )}
                    {total !== c.charge.price && <span style={{ fontSize: 13, color: T.ink2 }}>Precio {euros(c.charge.price)}</span>}
                    {c.charge.lines.map((line, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {c.charge.lines.length > 1 && <span style={{ fontSize: 13, fontWeight: 600, color: T.ink2 }}>{euros(line.amount)}</span>}
                        <div role="group" aria-label="Cómo paga" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {METHODS.map((m) => (
                            <button key={m.id} disabled={busy} aria-pressed={line.method === m.id} onClick={() => onPatch({ field: "charge.method", value: { line: i, method: m.id } })} style={{ ...(line.method === m.id ? chipOn : chip), padding: "0 12px", fontSize: 13 }}>{m.label}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {c.charge.lines.length === 1 && (
                      <button disabled={busy} onClick={() => onPatch({ field: "charge.split", value: true })} style={{ alignSelf: "flex-start", minHeight: 44, border: "none", background: "transparent", padding: 0, fontSize: 14, fontWeight: 600, color: T.ink, textDecoration: "underline" }}>Dividir el pago</button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ ...head, gap: 12 }}>
                <span style={{ fontSize: 15, color: T.ink2 }}>{c.charge.reason ?? "Va con bono, no hay cobro."}</span>
              </div>
            )}
          </div>

          <div style={section}>
            <div style={head}>
              <Toggle on={c.next.on} disabled={busy} label="Próxima cita" onChange={(v) => { onPatch({ field: "next.on", value: v }); if (!v) setOpenSlot(false); }} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>Próxima cita</span>
            </div>
            {c.next.on && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 0 8px 8px" }}>
                <div role="group" aria-label="Dentro de cuánto" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[2, 4, 6].map((w) => (
                    <button key={w} disabled={busy} aria-pressed={c.next.weeks === w} onClick={() => onPatch({ field: "next.weeks", value: w })} style={{ ...(c.next.weeks === w ? chipOn : chip), padding: "0 12px", fontSize: 13 }}>{w} sem</button>
                  ))}
                </div>
                {c.next.label && (
                  <button disabled={busy} aria-expanded={openSlot} onClick={() => setOpenSlot((v) => !v)} style={{ minHeight: 44, border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 16, fontWeight: 600, color: T.ink, textAlign: "left" }}>
                    {c.next.label}
                    {c.next.assumed && <span style={assumedTag}>{c.next.assumed}</span>}
                    <span style={{ transform: openSlot ? "rotate(90deg)" : "none", display: "flex" }}><Icon name="chev" size={16} color={T.mute} /></span>
                  </button>
                )}
                {openSlot && c.next.picker && (
                  <SlotPickerView picker={c.next.picker} disabled={busy} footer={false} onAnswer={(a) => {
                    if (a.type === "slot") { onPatch({ field: "next.slot", value: a.slot }); setOpenSlot(false); }
                    else if (a.type === "day") onPatch({ field: "next.day", value: a.delta });
                    else if (a.type === "professional") onPatch({ field: "next.professional", value: a.id });
                  }} />
                )}
              </div>
            )}
          </div>

          {c.whatsapp.available && c.next.on && (
            <div style={section}>
              <div style={head}>
                <Toggle on={c.whatsapp.on} disabled={busy} label="Mandar WhatsApp" onChange={(v) => onPatch({ field: "whatsapp.on", value: v })} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>Mandar WhatsApp</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <YesNo
        question={c.question}
        yesLabel={count > 1 ? `Sí, las ${count}` : "Sí"}
        canYes={!missingMethod && !nextIncomplete && patching === null}
        hint={missingMethod ? "Elige cómo paga." : nextIncomplete ? "Elige para cuándo." : undefined}
        saving={saving}
        onYes={onYes}
        onNo={onNo}
      />
    </div>
  );
}

/* ─────────────────────────── Bloques sueltos ─────────────────────────── */

function NextButtons({ actions, onAction }: { actions: Action[]; onAction: (a: Action) => void }) {
  if (!actions.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={label}>Lo siguiente</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {actions.map((a) => (
          <button key={a.id} onClick={() => onAction(a)} style={{ minHeight: 56, borderRadius: 18, border: "none", background: T.surface3, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 16, fontWeight: 600, color: T.ink, padding: "0 12px" }}>
            {a.icon && <Icon name={a.icon} />}{a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function UndoLink({ onUndo, ring }: { onUndo: () => void; ring: boolean }) {
  const [counting, setCounting] = useState(ring);
  useEffect(() => {
    if (!ring) return;
    const t = setTimeout(() => setCounting(false), 5000);
    return () => clearTimeout(t);
  }, [ring]);
  return (
    <button onClick={onUndo} style={{ minHeight: 44, border: "none", background: "transparent", padding: "0 4px", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: T.ink, textDecoration: "underline" }}>
      Deshacer
      {counting && (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="10" cy="10" r="8" fill="none" stroke={T.line} strokeWidth="2.5" />
          <circle cx="10" cy="10" r="8" fill="none" stroke={T.ink} strokeWidth="2.5" strokeDasharray="50.3" style={{ animation: "mc-ring 5s linear forwards" }} />
        </svg>
      )}
    </button>
  );
}

function ListBlock({ block, live, onAction, onInline, onNavigate }: {
  block: Extract<Block, { kind: "list" }>; live: boolean;
  onAction: (a: Action) => void;
  onInline: (row: Row) => Promise<string | null>;
  onNavigate?: (href: string) => void;
}) {
  const [all, setAll] = useState(false);
  const [done, setDone] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (!block.rows.length) return <p style={{ ...question, fontSize: 20 }}>{block.empty ?? "Nada."}</p>;
  const rows = all ? block.rows : block.rows.slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <p style={{ ...question, paddingBottom: 6 }}>{block.title}</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
        {rows.map((r) => {
          const isDone = r.id in done;
          return (
            <li key={r.id} style={{ minHeight: 64, display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: `1px solid ${T.line}`, opacity: isDone ? 0.55 : 1 }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{r.title}</span>
                {(isDone || r.detail) && <span style={{ fontSize: 13, color: T.mute }}>{isDone ? done[r.id] : r.detail}</span>}
              </span>
              {r.value && <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>{r.value}</span>}
              {r.action && live && (isDone ? (
                <span style={{ ...round44, background: T.okBg }}><Icon name="check" size={18} color={T.ok} width={2.6} /></span>
              ) : (
                <button disabled={busy !== null} onClick={async () => {
                  if (!r.inline) return onAction(r.action!);
                  setBusy(r.id);
                  const text = await onInline(r);
                  setBusy(null);
                  if (text) setDone((d) => ({ ...d, [r.id]: text }));
                }} style={{ minHeight: 44, borderRadius: 99, border: "none", background: T.surface3, padding: "0 16px", fontSize: 14, fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>{r.action.label}</button>
              ))}
            </li>
          );
        })}
      </ul>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {block.rows.length > 3 && (
          <button aria-expanded={all} onClick={() => setAll((v) => !v)} style={{ minHeight: 44, border: "none", background: "transparent", padding: 0, fontSize: 14, fontWeight: 600, color: T.ink, textDecoration: "underline" }}>
            {all ? "Ver menos" : `Ver las ${block.rows.length}`}
          </button>
        )}
        {block.openIn && onNavigate && (
          <button onClick={() => onNavigate(block.openIn!.href)} style={{ minHeight: 44, border: "none", background: "transparent", padding: 0, fontSize: 14, fontWeight: 600, color: T.ink, textDecoration: "underline" }}>{block.openIn.label}</button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Panel ─────────────────────────── */

type Item =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "marlen"; blocks: Block[] };

export default function MarlenChat({ open, onClose, api, screen, voice, onGhost, onNavigate }: MarlenChatProps) {
  const wide = useIsWide();
  const [items, setItems] = useState<Item[]>([]);
  const [fixed, setFixed] = useState<Fixed>(null);
  const [start, setStart] = useState<{ rows: StartRow[]; examples: string[] } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patching, setPatching] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [tall, setTall] = useState(true);
  const [hearing, setHearing] = useState<VoicePartial | null>(null);
  const stopVoice = useRef<(() => void) | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Sube al reiniciar/cerrar para ignorar respuestas tardías. */
  const turnGen = useRef(0);

  const last = items[items.length - 1];
  const liveBlocks = last?.role === "marlen" ? last.blocks : [];
  const livePreview = useMemo(() => {
    for (const b of liveBlocks) {
      if (b.kind === "proposal") return { id: b.proposal.previewId, ghost: b.proposal.ghost ?? null };
      if (b.kind === "checkout") return { id: b.checkout.previewId, ghost: b.checkout.ghost ?? null };
      if (b.kind === "preview") return { id: b.previewId, ghost: null };
    }
    return null;
  }, [liveBlocks]);

  const stopMic = useCallback(() => {
    stopVoice.current?.();
    stopVoice.current = null;
    setHearing(null);
  }, []);

  const restart = useCallback(() => {
    turnGen.current += 1;
    stopMic();
    setThinking(false);
    setSaving(false);
    setPatching(null);
    setItems([]);
    setFixed(null);
    setText("");
    setStart(null);
    setTall(true);
  }, [stopMic]);

  // Inicio según el momento (mejora 3).
  useEffect(() => {
    if (!open || items.length) return;
    let alive = true;
    api.start(screen).then((s) => { if (alive) setStart(s); }).catch(() => undefined);
    return () => { alive = false; };
  }, [open, items.length, api, screen]);

  // Al cerrar: invalidar turnos en vuelo y parar mic.
  useEffect(() => {
    if (open) return;
    turnGen.current += 1;
    stopMic();
    setThinking(false);
    setSaving(false);
    setPatching(null);
  }, [open, stopMic]);

  // Mic pillado: cortar a los 45 s.
  useEffect(() => {
    if (!hearing) return;
    const t = window.setTimeout(() => stopMic(), 45_000);
    return () => window.clearTimeout(t);
  }, [hearing, stopMic]);

  // Cita fantasma (mejora 5): la agenda la pinta; en móvil el panel baja para que se vea.
  const ghost = livePreview?.ghost ?? null;
  useEffect(() => { onGhost?.(open ? ghost : null); }, [ghost, open, onGhost]);
  const hasGhost = ghost !== null;
  useEffect(() => { setTall(!hasGhost); }, [hasGhost]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items, thinking, hearing]);

  // Con la propuesta viva se enseña desde arriba: el Sí va pegado abajo.
  const liveItemRef = useRef<HTMLDivElement>(null);
  const livePreviewId = livePreview?.id;
  useEffect(() => {
    if (!livePreviewId) return;
    const t = setTimeout(() => {
      const el = bodyRef.current;
      const item = liveItemRef.current;
      if (el && item) el.scrollTop = Math.max(0, item.offsetTop - 64);
    }, 260);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, tall]);

  const append = useCallback((res: TurnResult) => {
    if (res.fixed !== undefined) setFixed(res.fixed);
    if (res.blocks.length) setItems((prev) => [...prev, { id: uid(), role: "marlen", blocks: res.blocks }]);
  }, []);

  const offline: TurnResult = { blocks: [{ kind: "error", code: "offline", text: "Sin conexión. No se ha guardado.", actions: [] }] };
  const stuck: TurnResult = {
    blocks: [{
      kind: "error",
      code: "offline",
      text: "Tarda demasiado. Prueba otra vez o empieza de nuevo.",
      actions: [{ id: "retry", label: "Empezar de nuevo", send: "para" }],
    }],
  };

  const send = useCallback(async (input: ActionSend, said: string) => {
    if (thinking || saving) return;
    const gen = ++turnGen.current;
    setItems((prev) => [...prev, { id: uid(), role: "user", text: said }]);
    setThinking(true);
    const TURN_MS = 20_000;
    try {
      const res = await Promise.race([
        api.turn(input, screen, fixed, said),
        new Promise<TurnResult>((_, reject) => {
          window.setTimeout(() => reject(new Error("timeout")), TURN_MS);
        }),
      ]);
      if (gen !== turnGen.current) return;
      append(res);
    } catch (err) {
      if (gen !== turnGen.current) return;
      append(err instanceof Error && err.message === "timeout" ? stuck : offline);
    } finally {
      if (gen === turnGen.current) setThinking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, screen, fixed, append, thinking, saving]);

  const submitText = () => {
    const t = text.trim();
    if (!t || thinking || saving) return;
    setText("");
    void send(t, t);
  };

  const patch = async (previewId: string, p: PreviewPatch) => {
    setPatching(p.field === "hora" || p.field === "dia" ? "title" : p.field);
    try {
      const next = await api.patchPreview(previewId, p);
      setItems((prev) => prev.map((it, i) => i === prev.length - 1 && it.role === "marlen"
        ? { ...it, blocks: it.blocks.map((b) => (b.kind === "proposal" || b.kind === "checkout") ? next : b) }
        : it));
    } catch { append(offline); }
    finally { setPatching(null); }
  };

  const confirm = async (previewId: string) => {
    const gen = turnGen.current;
    setSaving(true);
    try {
      const res = await Promise.race([
        api.confirm(previewId),
        new Promise<TurnResult>((_, reject) => {
          window.setTimeout(() => reject(new Error("timeout")), 20_000);
        }),
      ]);
      if (gen !== turnGen.current) return;
      append(res);
    } catch (err) {
      if (gen !== turnGen.current) return;
      if (err instanceof Error && err.message === "timeout") append(stuck);
      else append({ blocks: [{ ...offline.blocks[0], actions: [{ id: "retry", label: "Otra vez", send: { intent: "retry", args: { previewId } } }, { id: "drop", label: "Dejarlo", send: "para" }] } as Block] });
    } finally {
      if (gen === turnGen.current) setSaving(false);
    }
  };

  const cancel = async (previewId: string) => {
    void api.cancel(previewId).catch(() => undefined);
    setItems((prev) => [...prev, { id: uid(), role: "user", text: "No" }, { id: uid(), role: "marlen", blocks: [{ kind: "text", text: "No se ha guardado.", tone: "mute" }] }]);
  };

  const undo = async (undoId: string) => {
    try { append(await api.undo(undoId)); } catch { append(offline); }
  };

  const inlineRow = async (row: Row): Promise<string | null> => {
    if (!row.action) return null;
    try {
      const res = await api.turn(row.action.send, screen, fixed, row.action.label);
      const b = res.blocks[0];
      if (b?.kind === "instant" || b?.kind === "text") return b.text;
      append(res);
      return null;
    } catch { append(offline); return null; }
  };

  const toggleMic = () => {
    if (hearing) { stopMic(); return; }
    if (!voice) { inputRef.current?.focus(); return; }
    if (thinking || saving) return;
    setHearing({ text: "", understood: [] });
    stopVoice.current = voice.start(
      (p) => setHearing(p),
      (finalText) => { stopVoice.current = null; setHearing(null); if (finalText.trim()) void send(finalText, finalText); },
    );
  };

  const onAction = (a: Action) => {
    if (typeof a.send === "string" && /^(para|nada)$/i.test(a.send) && a.id === "retry") {
      restart();
      return;
    }
    void send(a.send, a.label);
  };

  if (!open) return null;

  const placeholder = livePreview ? "«Sí», o di el cambio…" : liveBlocks.some((b) => b.kind === "ask") ? "O dilo…" : "Escribe o habla…";

  const renderBlock = (b: Block, live: boolean, key: number) => {
    switch (b.kind) {
      case "text":
        return (
          <p
            key={key}
            style={{
              margin: 0,
              fontSize: b.size === "lg" ? 17 : 15,
              lineHeight: 1.45,
              fontWeight: b.size === "lg" ? 600 : 400,
              color: b.tone === "mute" ? T.mute : T.ink,
            }}
          >
            {b.text}
          </p>
        );

      case "ask":
        if (!live) return <p key={key} style={{ margin: 0, fontSize: 15, color: T.mute }}>{b.question}</p>;
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {b.context?.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {b.context.map((c) => <span key={c} style={{ minHeight: 30, borderRadius: 99, border: `1px solid ${T.line}`, padding: "0 12px", display: "inline-flex", alignItems: "center", fontSize: 13, color: T.ink2 }}>{c}</span>)}
              </div>
            ) : null}
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4, fontWeight: 600, color: T.ink }}>{b.question}</p>
            <PickerView picker={b.picker} disabled={thinking} onPick={(value, said) => void send({ intent: "answer", args: { field: b.field, value } }, said)} />
          </div>
        );

      case "proposal":
        if (!live) return <p key={key} style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: T.mute }}>{b.proposal.heading}: {b.proposal.title} · {b.proposal.fields.map((f) => f.value).join(" · ")}</p>;
        return <ProposalCard key={key} proposal={b.proposal} saving={saving} patching={patching} canSeeAgenda={screen.route.startsWith("/agenda")} onSeeAgenda={onNavigate ? () => onNavigate(`/agenda?dia=${b.proposal.ghost?.day ?? ""}`) : undefined} onPatch={(p) => void patch(b.proposal.previewId, p)} onYes={() => void confirm(b.proposal.previewId)} onNo={() => void cancel(b.proposal.previewId)} />;

      case "checkout":
        if (!live) return <p key={key} style={{ margin: 0, fontSize: 15, color: T.mute }}>Salida de {b.checkout.appointment.clienta}</p>;
        return <CheckoutCard key={key} checkout={b.checkout} saving={saving} patching={patching} onPatch={(p) => void patch(b.checkout.previewId, p)} onYes={() => void confirm(b.checkout.previewId)} onNo={() => void cancel(b.checkout.previewId)} />;

      case "saved":
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: T.okBg, borderRadius: 22, padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ ...round44, background: T.ok }}><Icon name="check" size={22} color="#FFFFFF" width={2.6} /></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: T.okFg }}>{b.title}</span>
                <span style={{ fontSize: 14, lineHeight: 1.4, color: T.okFg }}>{b.summary}</span>
              </span>
            </div>
            {live && <NextButtons actions={b.next} onAction={onAction} />}
            {live && b.undoId && <div><UndoLink ring={false} onUndo={() => void undo(b.undoId!)} /></div>}
          </div>
        );

      case "instant":
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ width: 28, height: 28, borderRadius: 99, background: T.ok, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}><Icon name="check" size={16} color="#FFFFFF" width={2.8} /></span>
              <span style={{ flex: 1, minWidth: 160, fontSize: 18, fontWeight: 600 }}>{b.text}</span>
              {live && <UndoLink ring onUndo={() => void undo(b.undoId)} />}
            </div>
            {live && b.next && <NextButtons actions={b.next} onAction={onAction} />}
          </div>
        );

      case "list":
        return <ListBlock key={key} block={b} live={live} onAction={onAction} onInline={inlineRow} onNavigate={onNavigate} />;

      case "total":
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={label}>{b.title}</span>
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>{b.amount}</span>
            {b.lines.map((l) => (
              <div key={l.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 15, borderTop: `1px solid ${T.line}`, padding: "10px 0 2px" }}>
                <span style={{ color: T.mute }}>{l.label}</span><span style={{ fontWeight: 600 }}>{l.value}</span>
              </div>
            ))}
          </div>
        );

      case "preview":
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={label}>{b.label}</span>
              <div style={{ background: T.okBg, borderRadius: "6px 20px 20px 20px", padding: "14px 16px", fontSize: 15, lineHeight: 1.5 }}>
                {b.body.map((p, i) => typeof p === "string" ? <React.Fragment key={i}>{p}</React.Fragment> : <span key={i} style={{ fontWeight: 600, borderBottom: `2px dotted ${T.ok}` }}>{p.v}</span>)}
              </div>
              {b.note && <span style={{ fontSize: 13, lineHeight: 1.4, color: T.mute }}>{b.note}</span>}
            </div>
            {live && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {b.chips.map((a) => <button key={a.id} disabled={thinking || saving} onClick={() => onAction(a)} style={chip}>{a.label}</button>)}
                </div>
                <YesNo question={b.question} saving={saving} onYes={() => void confirm(b.previewId)} onNo={() => void cancel(b.previewId)} />
              </>
            )}
          </div>
        );

      case "alert":
        return (
          <div key={key} style={{ background: GRAD, borderRadius: 22, padding: 1.5 }}>
            <div style={{ background: T.surface, borderRadius: 20.5, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: 16, lineHeight: 1.4, fontWeight: 600 }}>{b.text}</span>
              {live && <button onClick={() => onAction(b.action)} style={{ ...btnYes, flex: "none", height: 48, fontSize: 15 }}>{b.action.label}</button>}
            </div>
          </div>
        );

      case "error": {
        const hard = b.code === "offline" || b.code === "conflict";
        if (!hard) {
          return (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: T.ink }}>{b.text}</p>
              {live && b.actions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {b.actions.map((a) => <button key={a.id} onClick={() => onAction(a)} style={{ ...chip, fontWeight: 600 }}>{a.label}</button>)}
                </div>
              )}
            </div>
          );
        }
        const [head, ...rest] = b.text.split(". ");
        return (
          <div key={key} role="alert" style={{ background: T.badBg, borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ ...round44, background: T.bad }}><Icon name="offline" size={22} color="#FFFFFF" width={2.2} /></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: T.badFg }}>{head.replace(/\.$/, "")}</span>
                {rest.length > 0 && <span style={{ fontSize: 15, color: T.badFg }}>{rest.join(". ")}</span>}
              </span>
            </div>
            {live && b.actions.length > 0 && (
              <div style={{ display: "flex", gap: 10 }}>
                {b.actions.map((a, i) => (
                  <button key={a.id} onClick={() => {
                    const retry = typeof a.send !== "string" && a.send.intent === "retry" ? String(a.send.args?.previewId ?? "") : "";
                    if (retry) void confirm(retry); else onAction(a);
                  }} style={i === 0 ? { ...btnYes, height: 52, fontSize: 16 } : { ...btnNo, height: 52, background: T.surface }}>{a.label}</button>
                ))}
              </div>
            )}
          </div>
        );
      }
    }
  };

  const sheet: React.CSSProperties = wide
    ? { position: "fixed", top: 0, right: 0, bottom: 0, width: 400, background: T.surface, borderLeft: `1px solid ${T.line}`, display: "flex", flexDirection: "column", zIndex: 50 }
    : { position: "fixed", left: 0, right: 0, bottom: 0, height: tall ? "calc(100dvh - 56px)" : "60dvh", background: T.surface, borderRadius: "28px 28px 0 0", display: "flex", flexDirection: "column", zIndex: 50, transition: "height 220ms cubic-bezier(.2,.8,.2,1)", boxShadow: "0 -8px 40px rgba(15,14,26,.12)" };

  return (
    <>
      <style>{CSS}</style>
      {!wide && tall && <div aria-hidden="true" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(221,220,228,.72)", zIndex: 49 }} />}
      <section role="dialog" aria-label="Chat de Marlén" className="mc mc-sheet" style={{ ...sheet, fontFamily: "inherit", color: T.ink }} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
        <header style={{ flex: "0 0 auto", padding: wide ? "14px 16px 4px" : "6px 16px 4px", display: "flex", flexDirection: "column", gap: 4 }}>
          {!wide && (
            <button aria-label={tall ? "Bajar el panel" : "Subir el panel"} onClick={() => setTall((v) => !v)} style={{ alignSelf: "center", width: 64, height: 20, border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 36, height: 4, borderRadius: 99, background: T.line }} />
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 99, background: GRAD, flex: "0 0 auto" }} />
            <span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>Marlén</span>
            {fixed && (
              <span style={{ minHeight: 32, borderRadius: 99, background: T.surface3, padding: "0 4px 0 12px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: T.brandA }} />
                {fixed.name}
                <button aria-label={`Soltar a ${fixed.name}`} onClick={() => setFixed(null)} style={{ width: 28, height: 28, border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={12} color={T.mute} width={2.4} /></button>
              </span>
            )}
            {(items.length > 0 || thinking || hearing) && (
              <button
                type="button"
                aria-label="Empezar de nuevo"
                onClick={restart}
                style={{ minHeight: 36, borderRadius: 99, border: `1px solid ${T.line}`, background: T.surface2, padding: "0 12px", fontSize: 13, fontWeight: 600, color: T.ink }}
              >
                De nuevo
              </button>
            )}
            <button aria-label="Cerrar el chat" onClick={onClose} style={round44}><Icon name="x" size={18} width={2.2} /></button>
          </div>
        </header>

        <div ref={bodyRef} aria-live="polite" style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 20px 0", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {items.length === 0 && !hearing && (
              <div className="mc-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.02em" }}>¿Qué deseas?</h1>
                {start && (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {start.rows.slice(0, 4).map((r) => (
                      <li key={r.id}>
                        <button onClick={() => void send(r.send, r.label)} style={{ width: "100%", minHeight: 64, borderRadius: 18, border: "none", background: T.surface3, display: "flex", alignItems: "center", gap: 12, padding: "0 16px 0 0", color: T.ink, textAlign: "left", overflow: "hidden" }}>
                          <span aria-hidden="true" style={{ width: 4, alignSelf: "stretch", background: r.now ? GRAD : "transparent" }} />
                          {r.icon && <Icon name={r.icon} size={22} />}
                          <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600 }}>{r.label}</span>
                          {r.detail && <span style={{ fontSize: 13, color: T.ink2, textAlign: "right" }}>{r.detail}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {start && start.examples.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={label}>O dilo tal cual</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {start.examples.map((e) => <button key={e} onClick={() => void send(e, e)} style={chip}>{e}</button>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {items.map((it, idx) => {
              const live = idx === items.length - 1;
              if (it.role === "user") {
                return <div key={it.id} className="mc-in" style={{ alignSelf: "flex-end", maxWidth: "82%", background: T.surface3, borderRadius: "20px 20px 6px 20px", padding: "12px 16px", fontSize: 15, lineHeight: 1.4, color: live || idx === items.length - 2 ? T.ink : T.mute }}>{it.text}</div>;
              }
              return <div key={it.id} ref={live ? liveItemRef : undefined} className="mc-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>{it.blocks.map((b, i) => renderBlock(b, live && !thinking, i))}</div>;
            })}

            {thinking && (
              <div role="status" aria-label="Marlén está pensando" style={{ display: "flex", gap: 6, height: 28, alignItems: "center" }}>
                {[0, 1, 2].map((i) => <span key={i} style={{ width: 8, height: 8, borderRadius: 99, background: T.ink, animation: `mc-dot 1s ${i * 0.15}s infinite` }} />)}
              </div>
            )}

            {hearing && (
              <div className="mc-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <p style={{ margin: 0, fontSize: 28, lineHeight: 1.25, fontWeight: 600, letterSpacing: "-0.01em", minHeight: 35 }}>{hearing.text || "Te escucho"}<span style={{ color: T.faint }}>…</span></p>
                {(hearing.understood.length > 0 || hearing.missing) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={label}>Voy entendiendo</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {hearing.understood.map((u, i) => <span key={u} style={{ minHeight: 40, borderRadius: 99, background: i === 0 ? T.ink : T.surface3, color: i === 0 ? "#FFFFFF" : T.ink, padding: "0 16px", display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600 }}>{u}</span>)}
                      {hearing.missing && <span style={{ minHeight: 40, boxSizing: "border-box", borderRadius: 99, border: `1.5px dashed ${T.faint}`, padding: "0 16px", display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600, color: T.mute }}>{hearing.missing}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <footer style={{ flex: "0 0 auto", padding: "14px 16px calc(16px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", gap: 10 }}>
          {hearing ? (
            <>
              <button aria-label="Cancelar" onClick={toggleMic} style={{ ...round44, width: 52, height: 52 }}><Icon name="x" size={18} width={2.2} /></button>
              <div aria-hidden="true" style={{ flex: 1, height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                {[10, 22, 34, 18, 40, 28, 44, 20, 36, 14, 26, 10].map((h, i) => <span key={i} style={{ width: 4, height: h, borderRadius: 99, background: GRAD }} />)}
              </div>
              <button aria-label="Terminar de hablar" onClick={() => { const t = hearing.text; toggleMic(); if (t.trim()) void send(t, t); }} style={{ width: 64, height: 64, flex: "0 0 auto", borderRadius: 99, border: "none", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 8px rgba(208,0,168,.12)" }}><Icon name="stop" size={22} color="#FFFFFF" /></button>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submitText(); }} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
              <input ref={inputRef} aria-label="Escribe a Marlén" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} enterKeyHint="send" autoComplete="off" style={{ flex: 1, minWidth: 0, height: 52, boxSizing: "border-box", borderRadius: 99, border: `1px solid ${T.line}`, background: T.surface2, padding: "0 20px", fontSize: 16, color: T.ink }} />
              {text.trim() ? (
                <button type="submit" aria-label="Enviar" disabled={thinking || saving} style={{ width: 52, height: 52, flex: "0 0 auto", borderRadius: 99, border: "none", background: T.ink, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="send" size={22} color="#FFFFFF" /></button>
              ) : (
                <button type="button" aria-label="Hablar" onClick={toggleMic} style={{ width: 52, height: 52, flex: "0 0 auto", borderRadius: 99, border: "none", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="mic" size={22} color="#FFFFFF" /></button>
              )}
            </form>
          )}
        </footer>
      </section>
    </>
  );
}
