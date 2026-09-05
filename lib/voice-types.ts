/**
 * Tipos que comparten el diálogo (lib/voice-dialog), las server actions y el panel.
 * Sin DOM ni next/*: se importan desde cualquier lado.
 */

import type { DayPart } from '@/lib/voice';

export type PendingNeed = 'client' | 'service' | 'time' | 'provider';

export type PendingBook = {
  who: string;
  startMin: number | null;
  dayOffset: number;
  providerQ: string | null;
  serviceQ: string | null;
  need: PendingNeed;
  /** Opciones ofrecidas para la pregunta actual (servicios o clientas). */
  choices?: string[] | null;
  slotMins?: number[];
  /** Veces que ya se ha preguntado esto: la segunda va corta. */
  asks?: number;
  /** Ya han dicho que es nueva: no volver a buscarla en fichas. */
  newClient?: boolean;
  /** «Esta tarde»: franja para los huecos que se ofrecen. */
  part?: DayPart | null;
};

export type PreviewCtx = {
  /** Opciones que se acaban de ofrecer (servicios o clientas, según `prevNeed`). */
  choices?: string[] | null;
  prevNeed?: PendingNeed;
  asks?: number;
  newClient?: boolean;
  part?: DayPart | null;
};

export type BookRef = {
  who: string;
  startMin: number | null;
  serviceQ: string | null;
  dayOffset: number;
  providerQ: string | null;
  newClient?: boolean;
  part?: DayPart | null;
};

export type BookDraft = {
  clientId?: string;
  clientName?: string;
  serviceId: string;
  providerId: string;
  date: string;
  startMin: number;
  durationMin: number;
  priceCents: number;
};

export type MoveDraft = { id: string; date: string; startMin: number; providerId: string };

export type MoveTo = { who: string; startMin: number; dayOffset: number; providerQ: string | null };

export type Choice = { id: string; label: string };

export type VoiceTurn = { role: 'user' | 'assistant'; content: string };

/** Lo que devuelve cualquier preview o la nube: el diálogo lo lee igual venga de donde venga. */
export type VoiceTalkResult = {
  ok: boolean;
  fallback?: boolean;
  /** Por qué no respondió la nube, para decirlo bien y apuntarlo. */
  reason?: 'off' | 'rate' | 'timeout' | 'openai';
  say: string;
  ear?: string;
  href?: string;
  ready?: boolean;
  draft?: Record<string, unknown>;
  matches?: Choice[];
  status?: 'curso' | 'noshow';
  cancel?: boolean;
  move?: boolean;
  need?: PendingNeed;
  pending?: PendingBook;
  options?: string[];
  /** Cita propuesta (¿La guardo?), por si la corrigen de viva voz. */
  book?: BookRef;
  /** Varias clientas para la lista de espera: elegir una. */
  wait?: boolean;
  /** Varias citas que mover: al elegir, se repite el preview con esa. */
  moveTo?: MoveTo;
};

/** Resultado de una acción que ya escribió algo (guardar, mover, cancelar…). */
export type FinalResult = { ok: boolean; say: string; href?: string; ear?: string };
