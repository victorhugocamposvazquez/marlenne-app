"use client";

/**
 * Demo del chat con datos de mentira. Sirve para ver y tocar todos los bloques.
 * Al integrar: se borra este archivo y se pasa a <MarlenChat> un `api` real.
 * Nada de lo que hay aquí es lógica de negocio: es un guion.
 */

import React, { useMemo, useState } from "react";
import MarlenChat, {
  GRAD, T, euros,
  type Action, type Block, type ChatApi, type Checkout, type Ghost, type Option, type PayMethod,
  type PreviewPatch, type Proposal, type ScreenContext, type Slot, type SlotAnswer, type SlotsPicker,
  type TurnResult, type VoiceAdapter,
} from "./MarlenChat";

/* ─────────────────────────── Datos de mentira ─────────────────────────── */

const TODAY = "2026-11-20"; // fecha fija de la demo: cámbiala por la real
const OPEN = "10:00";
const CLOSE = "20:00";

const PROS: Option[] = [{ id: "ana", label: "Ana" }, { id: "marta", label: "Marta" }];
const SERVICES: Record<string, { label: string; min: number; price: number }> = {
  facial: { label: "Facial", min: 50, price: 45 },
  profundo: { label: "Facial profundo", min: 75, price: 60 },
  cejas: { label: "Cejas", min: 30, price: 20 },
};
const BUSY: Record<string, { start: string; end: string; label: string; id: string }[]> = {
  ana: [
    { id: "c1", start: "10:00", end: "11:30", label: "Paula Soto · láser" },
    { id: "c2", start: "12:30", end: "14:00", label: "Carmen Vila · facial profundo" },
    { id: "c3", start: "16:00", end: "16:30", label: "Marta Ruiz · cejas" },
    { id: "c4", start: "18:00", end: "18:45", label: "Inés Lago · facial" },
  ],
  marta: [
    { id: "c5", start: "11:00", end: "12:00", label: "Sara Gil · manicura" },
    { id: "c6", start: "17:00", end: "18:00", label: "Noa Rey · facial" },
  ],
};

const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const addDays = (iso: string, d: number) => {
  const t = new Date(`${iso}T12:00:00`);
  t.setDate(t.getDate() + d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }).replace(",", "").replace(/\./g, "");
const isSunday = (iso: string) => new Date(`${iso}T12:00:00`).getDay() === 0;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[«»"¿?¡!.,]/g, "").trim();
const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));

function picker(day: string, pro: string, min: number, around = "17:00"): SlotsPicker {
  const busy = BUSY[pro] ?? [];
  const closed = isSunday(day);
  const free: Slot[] = [];
  if (!closed) {
    for (let s = toMin(OPEN); s + min <= toMin(CLOSE); s += 30) {
      if (!busy.some((b) => s < toMin(b.end) && s + min > toMin(b.start))) free.push({ day, start: fromMin(s), end: fromMin(s + min), professionalId: pro });
    }
  }
  const near = [...free].sort((a, b) => Math.abs(toMin(a.start) - toMin(around)) - Math.abs(toMin(b.start) - toMin(around))).slice(0, 3).sort((a, b) => toMin(a.start) - toMin(b.start));
  return {
    type: "slots", day, dayLabel: dayLabel(day), closed, durationMin: min,
    suggested: near, more: free.filter((f) => !near.includes(f)),
    strip: { open: OPEN, close: CLOSE, step: 15, busy: busy.map(({ start, end }) => ({ start, end })) },
    professionals: PROS, professionalId: pro,
  };
}

/* ─────────────────────────── API de mentira ─────────────────────────── */

type Draft = { day: string; start: string; pro: string; service: string; pay: "bono" | "sin"; assumedPro: boolean };
type Out = { charge: boolean; lines: { amount: number; method?: PayMethod }[]; next: boolean; weeks?: number; slot?: Slot; nextDay?: string; nextPro: string; whatsapp: boolean };

function createDemoApi(): ChatApi {
  let n = 0;
  let draft: Draft | null = null;
  let out: Out | null = null;
  let template: { id: string; variant: "base" | "corto" | "usted" } | null = null;
  let asking: { day: string; pro: string; service: string } | null = null;
  let previewId = "";
  const newId = () => (previewId = `p${++n}`);
  const expires = () => new Date(Date.now() + 120000).toISOString();
  const lucia = { id: "lucia", name: "Lucía Pérez" };

  const proposal = (): Block => {
    const d = draft!;
    const svc = SERVICES[d.service];
    const end = fromMin(toMin(d.start) + svc.min);
    const pro = PROS.find((p) => p.id === d.pro)!;
    const clash = (BUSY[d.pro] ?? []).filter((b) => toMin(d.start) < toMin(b.end) && toMin(end) > toMin(b.start)).map((b) => b.id);
    const p: Proposal = {
      previewId: newId(), expiresAt: expires(), intent: "cita_nueva", heading: "Cita nueva",
      title: `${dayLabel(d.day)} · ${d.start}`,
      titlePicker: picker(d.day, d.pro, svc.min, d.start),
      fields: [
        { id: "clienta", label: "Clienta", value: lucia.name, editable: false },
        { id: "servicio", label: "Servicio", value: svc.label, note: `· ${svc.min} min`, editable: true, picker: { type: "chips", options: Object.entries(SERVICES).map(([id, s]) => ({ id, label: s.label, hint: `${s.min} min` })) } },
        { id: "profesional", label: "Con", value: pro.label, assumed: d.assumedPro ? "la de siempre" : undefined, editable: true, picker: { type: "chips", options: PROS } },
        { id: "pago", label: "Pago", value: d.pay === "bono" ? "Su bono" : euros(svc.price), assumed: d.pay === "bono" ? "le quedan 3" : undefined, editable: true, picker: { type: "chips", options: [{ id: "bono", label: "Su bono" }, { id: "sin", label: "Sin bono" }] } },
      ],
      question: "¿La apunto?",
      ghost: { kind: "new", day: d.day, professionalId: d.pro, start: d.start, end, label: `${lucia.name} · ${svc.label.toLowerCase()}`, conflictWith: clash.length ? clash : undefined },
    };
    return { kind: "proposal", proposal: p };
  };

  const checkout = (): Block => {
    const o = out!;
    const nextDay = o.nextDay ?? (o.weeks ? addDays(TODAY, o.weeks * 7) : undefined);
    const slot = o.slot ?? (nextDay ? { day: nextDay, start: "16:30", end: "17:00", professionalId: o.nextPro } : undefined);
    const c: Checkout = {
      previewId: newId(), expiresAt: expires(),
      appointment: { id: "c3", clienta: "Marta Ruiz", service: "cejas", when: "Hoy, 16:00", professional: "Ana" },
      close: {},
      charge: { on: o.charge, available: true, price: 20, lines: o.lines },
      next: {
        on: o.next, weeks: o.weeks,
        label: o.next && slot ? `${dayLabel(slot.day)} · ${slot.start} · ${PROS.find((p) => p.id === slot.professionalId)!.label}` : undefined,
        assumed: o.next && slot && !o.slot ? "la más cercana a las 16:00" : undefined,
        picker: o.next && nextDay ? picker(nextDay, o.nextPro, 30, slot?.start) : undefined,
      },
      whatsapp: { on: o.whatsapp, available: true },
      question: "¿Lo hago?",
      ghost: o.next && slot ? { kind: "new", day: slot.day, professionalId: slot.professionalId, start: slot.start, end: slot.end, label: "Marta Ruiz · cejas" } : undefined,
    };
    return { kind: "checkout", checkout: c };
  };

  const preview = (): Block => {
    const v = template!.variant;
    const body = v === "usted"
      ? ["Hola ", { v: "Lucía" }, ", la esperamos el ", { v: "mar 24 nov a las 17:00" }, " para su ", { v: "facial" }, ". Estamos en [DIRECCIÓN DEL CENTRO]. Si no puede venir, cámbiela aquí: ", { v: "[enlace de reservas]" }]
      : v === "corto"
        ? [{ v: "Lucía" }, ", cita el ", { v: "mar 24 nov a las 17:00" }, ", ", { v: "facial" }, ". Cambios: ", { v: "[enlace de reservas]" }]
        : ["Hola ", { v: "Lucía" }, ", te esperamos el ", { v: "mar 24 nov a las 17:00" }, " para tu ", { v: "facial" }, ". Estamos en [DIRECCIÓN DEL CENTRO]. Si no puedes venir, cámbiala aquí: ", { v: "[enlace de reservas]" }];
    template!.id = newId();
    return {
      kind: "preview", previewId: template!.id, label: "Así le llegaría a una clienta de ejemplo", body,
      note: "Lo subrayado cambia con cada cita: nombre, fecha, servicio y enlace.",
      chips: [{ id: "usted", label: "De usted", send: "De usted" }, { id: "corto", label: "Aún más corto", send: "Aún más corto" }, { id: "antes", label: "La de antes", send: "La de antes" }],
      question: "¿Lo guardo?",
    };
  };

  const askSlots = (): Block => {
    const a = asking!;
    const svc = SERVICES[a.service];
    return { kind: "ask", question: "¿A qué hora?", field: "hora", picker: picker(a.day, a.pro, svc.min), context: [lucia.name, `${svc.label} · ${svc.min} min`, dayLabel(a.day)] };
  };

  const saved = (): TurnResult => {
    if (draft) {
      const d = draft; const svc = SERVICES[d.service];
      draft = null;
      return { blocks: [{ kind: "saved", title: "Apuntada", summary: `${lucia.name} · ${svc.label.toLowerCase()} · ${dayLabel(d.day)}, ${d.start} · con ${PROS.find((p) => p.id === d.pro)!.label}`, undoId: "u-cita", next: [{ id: "wa", label: "WhatsApp", icon: "whatsapp", send: "Mándale el WhatsApp" }, { id: "otra", label: "Otra cita", icon: "cita", send: "Otra cita" }] }] };
    }
    if (out) {
      const o = out; out = null;
      const parts = ["cerrada"];
      if (o.charge) parts.push(o.lines.map((l) => `${euros(l.amount)} ${l.method === "pendiente" ? "pendiente" : `con ${l.method}`}`).join(" y "));
      if (o.next) parts.push(`próxima ${dayLabel(o.slot?.day ?? o.nextDay ?? addDays(TODAY, (o.weeks ?? 4) * 7))} ${o.slot?.start ?? "16:30"}`);
      return { fixed: { id: "marta", name: "Marta Ruiz" }, blocks: [{ kind: "saved", title: "Hecho", summary: `Marta Ruiz: ${parts.join(", ")}.`, next: o.whatsapp ? [{ id: "wa", label: "WhatsApp", icon: "whatsapp", send: "Mándale el WhatsApp" }] : [], undoId: undefined }] };
    }
    if (template) { template = null; return { blocks: [{ kind: "saved", title: "Plantilla guardada", summary: "Las citas siguientes ya la usan.", next: [], undoId: "u-plantilla" }] }; }
    return { blocks: [{ kind: "text", text: "¿El sí de qué?" }] };
  };

  const notUnderstood: Block = {
    kind: "error", code: "not_understood", text: "No te he entendido. ¿Es una cita, una clienta, una tarea o la caja?",
    actions: [{ id: "a1", label: "Una cita", send: "Cita nueva" }, { id: "a2", label: "Una clienta", send: "Lucía Pérez" }, { id: "a3", label: "Una tarea", send: "Qué tareas hay" }, { id: "a4", label: "La caja", send: "Cuánto hemos hecho hoy" }],
  };

  return {
    async start() {
      await wait(200);
      return {
        rows: [
          { id: "s1", now: true, icon: "cerrar", label: "Cerrar la de Marta Ruiz", detail: "cejas · en cabina", send: { intent: "checkout", args: { citaId: "c3" } } },
          { id: "s2", icon: "cabina", label: "Pasa Lucía Pérez a cabina", detail: "17:00 · llega ahora", send: "Lucía Pérez pasa a cabina" },
          { id: "s3", icon: "cobrar", label: "2 sin cobrar", detail: "65,00 €", send: "Quién falta por cobrar" },
          { id: "s4", icon: "cita", label: "Cita nueva", send: "Cita nueva" },
        ],
        examples: ["Lucía martes 5 facial", "Plantilla WhatsApp", "Cita a Lucía el jueves por la tarde"],
      };
    },

    async turn(input) {
      await wait();
      if (typeof input !== "string") {
        const args = input.args ?? {};
        if (input.intent === "checkout") {
          out = { charge: true, lines: [{ amount: 20 }], next: false, nextPro: "ana", whatsapp: false };
          draft = null; template = null;
          return { fixed: { id: "marta", name: "Marta Ruiz" }, blocks: [checkout()] };
        }
        if (input.intent === "cobro") {
          return { blocks: [{ kind: "ask", question: `¿Cómo paga ${String(args.name)}?`, field: "medio", context: [String(args.amount)], picker: { type: "chips", options: [{ id: "efectivo", label: "Efectivo" }, { id: "tarjeta", label: "Tarjeta" }, { id: "bizum", label: "Bizum" }] } }] };
        }
        if (input.intent === "tarea_hecha") return { blocks: [{ kind: "instant", text: "Hecha.", undoId: "u-tarea" }] };
        if (input.intent === "answer") {
          if (args.field === "medio") return { blocks: [{ kind: "saved", title: "Cobrado", summary: `Con ${String(args.value)}.`, next: [], undoId: undefined }] };
          if (args.field === "clienta") {
            asking = { day: "2026-11-24", pro: "ana", service: "facial" };
            return { fixed: lucia, blocks: [askSlots()] };
          }
          if (args.field === "hora" && asking) {
            const a = args.value as SlotAnswer;
            if (a.type === "slot") {
              draft = { day: a.slot.day, start: a.slot.start, pro: a.slot.professionalId, service: asking.service, pay: "bono", assumedPro: false };
              asking = null;
              return { fixed: lucia, blocks: [proposal()] };
            }
            if (a.type === "day") { asking.day = addDays(asking.day, a.delta); return { blocks: [askSlots()] }; }
            if (a.type === "professional") { asking.pro = a.id; return { blocks: [askSlots()] }; }
            if (a.type === "wait") { asking = null; return { blocks: [{ kind: "instant", text: "Lucía Pérez, en espera: tardes.", undoId: "u-espera" }] }; }
            return { blocks: [{ kind: "text", text: "¿Qué día?" }] };
          }
        }
        return { blocks: [notUnderstood] };
      }

      const t = norm(input);
      const has = (...w: string[]) => w.some((x) => t.includes(x));

      if (["si", "vale", "hazlo", "dale", "adelante", "apuntala", "guardalo"].includes(t)) return saved();
      if (["para", "nada", "olvidalo", "no", "dejalo"].includes(t)) { draft = null; out = null; template = null; asking = null; return { blocks: [{ kind: "text", text: "Vale.", tone: "mute" }] }; }
      if (has("deshaz", "me he equivocado")) return { blocks: [{ kind: "text", text: "Deshecho.", tone: "mute" }] };
      if (has("mandale el whatsapp")) return { blocks: [{ kind: "text", text: "Abro WhatsApp con el texto listo.", tone: "mute" }] };

      if (template && has("de usted")) { template.variant = "usted"; return { blocks: [preview()] }; }
      if (template && has("mas corto")) { template.variant = "corto"; return { blocks: [preview()] }; }
      if (template && has("la de antes")) { template.variant = "base"; return { blocks: [preview()] }; }
      if (has("plantilla", "wasap", "whatsapp de")) { template = { id: "", variant: "base" }; draft = null; out = null; return { blocks: [{ kind: "text", text: "Esta es la de ahora. ¿Qué le cambio?", tone: "mute" }, preview()] }; }

      if (has("cuesta", "precio")) return { blocks: [{ kind: "error", code: "role_admin", text: "Eso lo hace dirección.", actions: [] }] };
      if (has("falta por cobrar", "sin cobrar")) {
        return { blocks: [{ kind: "list", title: "2 sin cobrar · 65,00 €", openIn: { label: "Abrir en Finanzas", href: "/finanzas" }, rows: [
          { id: "r1", title: "Marta Ruiz", detail: "cejas · hoy 16:00", value: "20,00 €", action: { id: "cb1", label: "Cobrar", send: { intent: "cobro", args: { name: "Marta Ruiz", amount: "20,00 €" } } } },
          { id: "r2", title: "Carmen Vila", detail: "facial profundo · hoy 12:30", value: "45,00 €", action: { id: "cb2", label: "Cobrar", send: { intent: "cobro", args: { name: "Carmen Vila", amount: "45,00 €" } } } },
        ] }] };
      }
      if (has("tareas")) {
        const done = (id: string): Action => ({ id, label: "Hecha", send: { intent: "tarea_hecha", args: { id } } });
        return { blocks: [{ kind: "list", title: "4 tareas para hoy", rows: [
          { id: "t1", title: "Pedir toallas", detail: "para Ana", value: "hoy", inline: true, action: done("t1") },
          { id: "t2", title: "Llamar al técnico del láser", detail: "para ti", value: "hoy", inline: true, action: done("t2") },
          { id: "t3", title: "Revisar caja", detail: "para ti", value: "hoy", inline: true, action: done("t3") },
          { id: "t4", title: "Reponer cera", detail: "para Marta", value: "hoy", inline: true, action: done("t4") },
        ] }] };
      }
      if (has("cuanto hemos", "caja", "cobrado hoy")) return { blocks: [{ kind: "total", title: "Cobrado hoy", amount: "310,00 €", lines: [{ label: "Tarjeta", value: "190,00 €" }, { label: "Efectivo", value: "80,00 €" }, { label: "Bizum", value: "40,00 €" }] }] };
      if (has("pasa a cabina", "pasala")) return { fixed: lucia, blocks: [{ kind: "instant", text: "Lucía Pérez, en cabina.", undoId: "u-cabina" }] };
      if (has("cierr", "ya esta", "ha terminado")) {
        out = { charge: true, lines: [{ amount: 20, method: has("tarjeta") ? "tarjeta" : has("efectivo") ? "efectivo" : has("bizum") ? "bizum" : undefined }], next: false, nextPro: "ana", whatsapp: false };
        draft = null; template = null;
        return { fixed: { id: "marta", name: "Marta Ruiz" }, blocks: [checkout()] };
      }
      if (has("jueves", "por la tarde")) { asking = { day: "2026-11-26", pro: "ana", service: "facial" }; return { fixed: lucia, blocks: [askSlots()] }; }
      if (has("lucia") && has("martes", "facial", " 5")) {
        draft = { day: "2026-11-24", start: "17:00", pro: "ana", service: "facial", pay: "bono", assumedPro: true };
        out = null; template = null;
        return { fixed: lucia, blocks: [proposal()] };
      }
      if (has("lucia")) {
        return { blocks: [{ kind: "ask", question: "Hay dos. ¿Cuál?", field: "clienta", picker: { type: "people", allowNew: true, options: [
          { id: "lucia", name: "Lucía Pérez", tail: "la del 331", lastVisit: "Vino el 3 nov · facial con Ana" },
          { id: "lucia2", name: "Lucía Pérez", tail: "la del 908", lastVisit: "Vino el 12 jun · cejas con Marta" },
        ] } }] };
      }
      if (has("cita")) return { blocks: [{ kind: "ask", question: "¿De quién?", field: "clienta", picker: { type: "none" } }] };
      return { blocks: [notUnderstood] };
    },

    async patchPreview(_id: string, p: PreviewPatch) {
      await wait(250);
      if (draft) {
        if (p.field === "hora") { const s = p.value as Slot; draft.day = s.day; draft.start = s.start; draft.pro = s.professionalId; }
        if (p.field === "dia") draft.day = addDays(draft.day, Number(p.value));
        if (p.field === "profesional") { draft.pro = String(p.value); draft.assumedPro = false; }
        if (p.field === "servicio") draft.service = String(p.value);
        if (p.field === "pago") draft.pay = p.value === "bono" ? "bono" : "sin";
        return proposal();
      }
      if (out) {
        if (p.field === "charge.on") out.charge = Boolean(p.value);
        if (p.field === "charge.amount") out.lines = [{ amount: Number(p.value), method: out.lines[0]?.method }];
        if (p.field === "charge.method") { const v = p.value as { line: number; method: PayMethod }; out.lines = out.lines.map((l, i) => (i === v.line ? { ...l, method: v.method } : l)); }
        if (p.field === "charge.split") { const total = out.lines.reduce((s, l) => s + l.amount, 0); out.lines = [{ amount: total / 2, method: out.lines[0]?.method }, { amount: total / 2 }]; }
        if (p.field === "next.on") { out.next = Boolean(p.value); if (out.next && !out.weeks) out.weeks = 4; if (!out.next) { out.whatsapp = false; out.slot = undefined; out.nextDay = undefined; } }
        if (p.field === "next.weeks") { out.weeks = Number(p.value); out.slot = undefined; out.nextDay = undefined; }
        if (p.field === "next.slot") out.slot = p.value as Slot;
        if (p.field === "next.day") { out.nextDay = addDays(out.slot?.day ?? out.nextDay ?? addDays(TODAY, (out.weeks ?? 4) * 7), Number(p.value)); out.slot = undefined; }
        if (p.field === "next.professional") { out.nextPro = String(p.value); out.slot = undefined; }
        if (p.field === "whatsapp.on") out.whatsapp = Boolean(p.value);
        return checkout();
      }
      return { kind: "error", code: "expired", text: "¿El sí de qué?", actions: [] };
    },

    async confirm(id: string) {
      await wait();
      if (id !== previewId) return { blocks: [{ kind: "text", text: "¿El sí de qué?" }] };
      return saved();
    },
    async cancel() { draft = null; out = null; template = null; },
    async undo() { await wait(250); return { blocks: [{ kind: "text", text: "Deshecho.", tone: "mute" }] }; },
  };
}

const demoVoice: VoiceAdapter = {
  start(onPartial, onFinal) {
    const steps = [
      { text: "Lucía Pérez", understood: ["Lucía Pérez"] },
      { text: "Lucía Pérez, el martes", understood: ["Cita nueva", "Lucía Pérez", "mar 24 nov"], missing: "Falta la hora" },
      { text: "Lucía Pérez, el martes a las cinco", understood: ["Cita nueva", "Lucía Pérez", "mar 24 nov", "17:00"], missing: "Falta el servicio" },
      { text: "Lucía Pérez, el martes a las cinco, facial", understood: ["Cita nueva", "Lucía Pérez", "mar 24 nov", "17:00", "Facial"] },
    ];
    const timers = steps.map((s, i) => setTimeout(() => onPartial(s), 500 + i * 700));
    timers.push(setTimeout(() => onFinal("Lucía martes 5 facial"), 500 + steps.length * 700 + 400));
    return () => timers.forEach(clearTimeout);
  },
};

/* ─────────────────────────── Agenda de fondo, con la cita fantasma ─────────────────────────── */

const H = 64; // px por hora
const FROM = 15;
const TO = 20;

function DemoAgenda({ ghost, onOpen }: { ghost: Ghost | null; onOpen: () => void }) {
  const top = (hhmm: string) => ((toMin(hhmm) - FROM * 60) / 60) * H;
  return (
    <main style={{ minHeight: "100dvh", background: "#FFFFFF", color: T.ink, padding: "20px 20px 120px", boxSizing: "border-box" }}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 12, paddingBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Agenda</h1>
        <span style={{ fontSize: 14, color: T.mute }}>{ghost ? dayLabel(ghost.day) : dayLabel(TODAY)}</span>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "44px repeat(2, minmax(0, 1fr))", gap: 8, maxWidth: 720 }}>
        <span />
        {PROS.map((p) => <span key={p.id} style={{ fontSize: 13, fontWeight: 600, color: T.mute, paddingBottom: 6 }}>{p.label}</span>)}
        <div style={{ position: "relative", height: (TO - FROM) * H }}>
          {Array.from({ length: TO - FROM + 1 }, (_, i) => <span key={i} style={{ position: "absolute", top: i * H - 8, fontSize: 12, fontWeight: 600, color: T.mute }}>{FROM + i}:00</span>)}
        </div>
        {PROS.map((p) => (
          <div key={p.id} style={{ position: "relative", height: (TO - FROM) * H, borderRadius: 14, background: `repeating-linear-gradient(${T.surface2} 0 ${H - 1}px, ${T.line} ${H - 1}px ${H}px)` }}>
            {(BUSY[p.id] ?? []).filter((b) => toMin(b.end) > FROM * 60).map((b) => {
              const clash = ghost?.professionalId === p.id && ghost.conflictWith?.includes(b.id);
              return <div key={b.id} style={{ position: "absolute", left: 4, right: 4, top: top(b.start), height: ((toMin(b.end) - toMin(b.start)) / 60) * H - 2, borderRadius: 10, background: "#FFFFFF", border: `1.5px solid ${clash ? T.bad : T.line}`, padding: "6px 10px", fontSize: 12, fontWeight: 600, overflow: "hidden", boxSizing: "border-box" }}>{b.label}</div>;
            })}
            {ghost && ghost.professionalId === p.id && toMin(ghost.start) >= FROM * 60 && (
              <div style={{ position: "absolute", left: 4, right: 4, top: top(ghost.start), height: ((toMin(ghost.end) - toMin(ghost.start)) / 60) * H - 2, borderRadius: 10, background: "rgba(255,255,255,.7)", border: `1.5px dashed ${ghost.conflictWith?.length ? T.bad : T.brandA}`, padding: "6px 10px", fontSize: 12, fontWeight: 600, overflow: "hidden", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 11, color: T.assumedFg }}>por confirmar</span>
                {ghost.label}
              </div>
            )}
          </div>
        ))}
      </div>
      <button aria-label="Abrir el chat de Marlén" onClick={onOpen} style={{ position: "fixed", right: 20, bottom: 24, width: 60, height: 60, borderRadius: 99, border: "none", background: GRAD, cursor: "pointer", boxShadow: "0 10px 28px rgba(208,0,168,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></svg>
      </button>
    </main>
  );
}

export default function MarlenChatDemo() {
  const api = useMemo(createDemoApi, []);
  const [open, setOpen] = useState(true);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const screen = useMemo<ScreenContext>(() => ({ route: "/agenda", title: "Agenda" }), []);
  return (
    <>
      <DemoAgenda ghost={ghost} onOpen={() => setOpen(true)} />
      <MarlenChat open={open} onClose={() => setOpen(false)} api={api} screen={screen} voice={demoVoice} onGhost={setGhost} onNavigate={() => undefined} />
    </>
  );
}
