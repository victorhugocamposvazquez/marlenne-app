'use server';

import { addToWaitlist } from '@/app/actions/clients';
import { cancelAppointment, createAppointment, rescheduleAppointment, updateStatus } from '@/app/actions/appointments';
import { requireSession } from '@/lib/require-session';
import {
  freeSlots, getDayAgenda, listClientOptions, listProviders, listServices,
} from '@/lib/queries';
import { CATEGORIES } from '@/lib/categories';
import { dateFromOffset, dayKey, dayTitle, fmt, minutesOfDay, offsetFromDay } from '@/lib/time';
import {
  bestNameMatches, dayPartRange, earAskSave, earAskTime, earAskTimeHoles, earHoraOcupada,
  earHueco, earHuecos, earMove, earNadie, earSaved, earTodayCount,
  type DayPart,
} from '@/lib/voice';
import { joinO, resolveService, serviceBase, variantQuestion } from '@/lib/voice-services';
import { resolveClient, rowsByClient, shortNames } from '@/lib/voice-clients';
import { reportVoiceEvent } from '@/lib/voice-events';

/** Desde el iPad: lo que no se entendió. No devuelve nada; no espera. */
export async function voiceReport(said: string, outcome: string, detail?: string | null) {
  await requireSession();
  await reportVoiceEvent(said, outcome, detail);
}

export type PendingBook = {
  who: string;
  startMin: number | null;
  dayOffset: number;
  providerQ: string | null;
  serviceQ: string | null;
  need: 'client' | 'service' | 'time';
  /** Opciones ofrecidas para la pregunta actual (servicios o clientas). */
  choices?: string[] | null;
  slotMins?: number[];
  /** Veces que ya se ha preguntado esto: la segunda va corta. */
  asks?: number;
  /** Ya han dicho que es nueva: no volver a buscarla en fichas. */
  newClient?: boolean;
};

export type PreviewCtx = {
  /** Opciones que se acaban de ofrecer (servicios o clientas, según `prevNeed`). */
  choices?: string[] | null;
  prevNeed?: PendingBook['need'];
  asks?: number;
  newClient?: boolean;
};

export const NEW_CLIENT_CHIP = 'Es nueva';

async function firstFreeMins(
  providers: { id: string }[],
  when: Date,
  durationMin: number,
  limit = 4,
) {
  const seen = new Set<number>();
  for (const p of providers) {
    for (const iso of await freeSlots(p.id, when, durationMin)) {
      seen.add(minutesOfDay(iso));
    }
    if (seen.size >= 12) break;
  }
  return [...seen].sort((a, b) => a - b).slice(0, limit);
}

async function scope() {
  const me = await requireSession();
  const all = await listProviders();
  const providers = me.role === 'provider' ? all.filter(p => p.id === me.id) : all;
  return { me, providers };
}

/** Si el dictado es (o empieza por) el nombre de una clienta, empezamos cita. Homónimas también valen: se pregunta luego. */
export async function voiceMatchClient(q: string) {
  const clients = await listClientOptions();
  const r = resolveClient(clients, q.trim());
  if (r.kind === 'one') return r.client.full_name;
  if (r.kind === 'several') return q.trim();
  return null;
}

export async function voiceToday() {
  const { providers } = await scope();
  const { appointments } = await getDayAgenda(new Date(), providers.map(p => p.id));
  const live = appointments.filter(a => a.status === 'curso');
  const next = appointments.filter(a => a.status === 'prog')
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    .slice(0, 4);
  const bits = [`Hoy hay ${appointments.length} ${appointments.length === 1 ? 'cita' : 'citas'}.`];
  if (live.length) bits.push(`En cabina: ${live.map(a => a.client_label).join(', ')}.`);
  if (next.length) {
    bits.push(`Siguientes: ${next.map(a => `${a.client_label} a las ${fmt(minutesOfDay(a.starts_at))}`).join(', ')}.`);
  }
  return { ok: true as const, say: bits.join(' '), ear: earTodayCount(appointments.length), href: '/hoy' };
}

export async function voicePreviewStatus(who: string, status: 'curso' | 'noshow') {
  const { providers } = await scope();
  const { appointments } = await getDayAgenda(new Date(), providers.map(p => p.id));
  const pool = appointments.filter(a => status === 'curso'
    ? a.status === 'prog'
    : a.status === 'prog' || a.status === 'curso');
  const matches = rowsByClient(pool, who, a => a.client_label).map(a => ({
    id: a.id,
    label: `${a.client_label} · ${fmt(minutesOfDay(a.starts_at))} · ${a.service_name}`,
  }));
  if (matches.length === 0) {
    return {
      ok: false as const,
      say: `No encuentro a ${who} en la agenda de hoy.`,
      ear: 'No encuentro a esa clienta.',
      matches: [],
    };
  }
  const verb = status === 'curso' ? 'Pasa a cabina' : 'No vino';
  if (matches.length === 1) {
    return { ok: true as const, say: `${verb}: ${matches[0].label}. ¿Lo marco?`, ear: '¿Lo marco?', matches };
  }
  return { ok: true as const, say: `Hay varias. ¿Cuál es?`, matches };
}

export async function voiceApplyStatus(id: string, status: 'curso' | 'noshow') {
  const r = await updateStatus(id, status);
  return {
    ok: r.ok,
    say: r.ok
      ? (status === 'curso' ? 'La paso a cabina.' : 'Marcada como no vino.')
      : (r.error ?? 'No se ha podido cambiar'),
    href: '/hoy',
  };
}

export async function voiceSlots(
  dayOffset = 0, startMin: number | null = null, providerQ: string | null = null, part: DayPart | null = null,
) {
  const { providers } = await scope();
  const when = dateFromOffset(dayOffset);
  const range = part ? dayPartRange(part) : null;
  const inRange = (m: number) => !range || (m >= range.fromMin && m < range.toMin);
  const whenLbl = part
    ? `${dayTitle(dayOffset)} por la ${part === 'manana' ? 'mañana' : 'tarde'}`
    : dayTitle(dayOffset);
  const href = `/agenda${dayOffset ? `?day=${dayOffset}` : ''}`;
  const pool = providerQ
    ? bestNameMatches(providers, providerQ, p => p.full_name)
    : providers;
  if (providerQ && pool.length === 0) {
    return { ok: false as const, say: `No encuentro a ${providerQ} en el equipo.`, href };
  }

  if (startMin !== null) {
    const free: string[] = [];
    for (const p of pool) {
      const slots = await freeSlots(p.id, when, 60);
      if (slots.map(minutesOfDay).includes(startMin)) free.push(p.full_name.split(' ')[0]);
    }
    if (free.length === 0) {
      return {
        ok: true as const,
        say: `Nadie libre ${whenLbl} a las ${fmt(startMin)}.`,
        ear: earNadie(dayOffset, startMin),
        href,
      };
    }
    return {
      ok: true as const,
      say: `${free.join(', ')} ${free.length === 1 ? 'está libre' : 'están libres'} ${whenLbl} a las ${fmt(startMin)}.`,
      ear: earHueco(dayOffset, startMin),
      href,
    };
  }

  const lines: string[] = [];
  const seen = new Set<number>();
  for (const p of pool) {
    const slots = (await freeSlots(p.id, when, 60)).map(minutesOfDay).filter(inRange);
    slots.slice(0, 4).forEach(m => seen.add(m));
    if (slots.length) lines.push(`${p.full_name.split(' ')[0]}: ${slots.map(fmt).join(', ')}`);
  }
  const mins = [...seen].sort((a, b) => a - b).slice(0, 4);
  if (!lines.length) {
    return {
      ok: true as const,
      say: `No quedan huecos de una hora ${whenLbl}.`,
      ear: 'No quedan huecos.',
      href,
    };
  }
  return {
    ok: true as const,
    say: `Huecos ${whenLbl}. ${lines.join('. ')}.`,
    ear: earHuecos(dayOffset, mins),
    href,
  };
}

export async function voicePreviewBook(
  who: string, startMin: number | null, serviceQ: string | null, dayOffset = 0, providerQ: string | null = null,
  ctx: PreviewCtx = {},
) {
  const choices = ctx.choices ?? null;
  const newClient = ctx.newClient ?? false;
  /** El contador solo sigue si la pregunta es la misma; al cambiar de tema empieza de cero. */
  const asksFor = (need: PendingBook['need']) => (ctx.prevNeed === need ? ctx.asks ?? 0 : 0);
  const when = dateFromOffset(dayOffset);
  const qs = new URLSearchParams({ new: '1', nombre: who });
  if (dayOffset) qs.set('day', String(dayOffset));
  if (startMin !== null) qs.set('hora', fmt(startMin));
  if (serviceQ) qs.set('servicio', serviceQ);
  const { providers: team } = await scope();
  let providers = team;
  if (providerQ) {
    const hits = bestNameMatches(team, providerQ, p => p.full_name);
    if (hits.length === 0) {
      return {
        ok: false as const, ready: false as const,
        href: `/agenda?${qs}`,
        say: `No encuentro a ${providerQ} en el equipo.`,
      };
    }
    providers = hits;
    if (hits.length === 1) qs.set('pro', hits[0].id);
  }
  const href = `/agenda?${qs.toString()}`;
  const whenLbl = dayTitle(dayOffset);
  const whenBit = dayOffset === 0 ? '' : `, ${whenLbl.toLowerCase()}`;
  const withPro = providerQ ? ` con ${providers[0].full_name.split(' ')[0]}` : '';
  const cats = Object.values(CATEGORIES).map(c => c.label);
  const spoken = (items: string[], max = 5) => {
    const short = items.slice(0, max);
    const list = short.length <= 1
      ? (short[0] ?? '')
      : short.length === 2
        ? `${short[0]} o ${short[1]}`
        : `${short.slice(0, -1).join(', ')} o ${short[short.length - 1]}`;
    return items.length > max ? `${list}, y más en pantalla` : list;
  };
  const [clients, allServices] = await Promise.all([listClientOptions(), listServices()]);

  // 1. Quién es. Homónimas → preguntar; parecidas → ofrecer + «Es nueva»; nadie → ¿la doy de alta?
  const clientAsks = asksFor('client');
  const askClient = (say: string, options: string[], lock: string[] | null, ear: string) => ({
    ok: true as const,
    ready: false as const,
    need: 'client' as const,
    pending: {
      who, startMin, dayOffset, providerQ, serviceQ, need: 'client' as const,
      choices: lock?.length ? lock : undefined,
      asks: clientAsks + 1,
    },
    options,
    href,
    say,
    ear,
  });
  const clientWithin = ctx.prevNeed === 'client' && choices?.length
    ? clients.filter(c => choices.some(n => n.toLowerCase() === c.full_name.toLowerCase()))
    : null;
  const whoRes = newClient ? { kind: 'none' as const } : resolveClient(clients, who, clientWithin);
  if (whoRes.kind === 'several') {
    const names = whoRes.options.map(c => c.full_name);
    const short = shortNames(whoRes.options);
    return askClient(
      clientAsks >= 1 ? '¿Cuál de estas?' : `¿${joinO(short)}?`,
      names,
      names,
      clientAsks >= 1 ? '¿Cuál?' : 'Hay varias. ¿Cuál es?',
    );
  }
  if (whoRes.kind === 'similar') {
    const names = whoRes.options.map(c => c.full_name);
    return askClient(
      clientAsks >= 1 ? `¿Cuál de estas, o es nueva?` : `No tengo a ${who}. ¿${joinO(names)}? ¿O es nueva?`,
      [...names, NEW_CLIENT_CHIP],
      names,
      clientAsks >= 1 ? '¿Cuál?' : 'No la tengo. ¿Es alguna de estas?',
    );
  }
  if (whoRes.kind === 'none' && !newClient) {
    await reportVoiceEvent(who, 'no_client');
    return askClient(
      `${who} no está en fichas. ¿La doy de alta?`,
      [NEW_CLIENT_CHIP],
      null,
      'No está en fichas. ¿La doy de alta?',
    );
  }
  const client = whoRes.kind === 'one' ? whoRes.client : null;
  const whoLabel = client?.full_name ?? who;
  if (client) qs.set('nombre', client.full_name);

  // 2. Qué servicio.
  const asks = asksFor('service');
  const again = asks >= 1;
  const askService = (
    say: string,
    options: string[],
    lock: string[] | null,
    ear = '¿Qué servicio?',
  ) => ({
    ok: true as const,
    ready: false as const,
    need: 'service' as const,
    pending: {
      who: whoLabel, startMin, dayOffset, providerQ, serviceQ: null, need: 'service' as const,
      choices: lock?.length ? lock : undefined,
      asks: asks + 1,
      newClient: !client,
    },
    options,
    href,
    say,
    ear,
  });
  const within = ctx.prevNeed === 'service' && choices?.length
    ? allServices.filter(s => choices.some(c => c.toLowerCase() === s.name.toLowerCase()))
    : null;

  if (!serviceQ) {
    return askService(again ? '¿Qué servicio?' : `¿Qué le hacemos a ${whoLabel}?`, cats, null);
  }

  const found = resolveService(allServices, serviceQ, within);

  if (found.kind === 'variants') {
    const q = variantQuestion(found.base, found.options);
    return askService(q.say, found.options.map(s => s.name), found.options.map(s => s.name), q.ear);
  }

  if (found.kind === 'list') {
    const names = found.options.map(s => s.name);
    const fams = found.families;
    const say = again
      ? '¿Cuál?'
      : found.title
        ? `${found.title}: ${spoken(fams)}. ¿Cuál?`
        : `Hay varias: ${spoken(fams)}. ¿Cuál?`;
    return askService(say, fams.length < names.length ? fams : names, names, again ? '¿Cuál?' : 'Hay varias. ¿Cuál es?');
  }

  if (found.kind === 'none') {
    await reportVoiceEvent(serviceQ, 'no_service', within?.length ? `entre: ${within.map(s => s.name).join(', ')}`.slice(0, 200) : null);
    if (within?.length) {
      const fams = [...new Set(within.map(s => serviceBase(s.name)))];
      const opts = fams.length < within.length && fams.length > 1 ? fams : within.map(s => s.name);
      return askService(
        asks >= 2 ? 'No lo pillo. Toca una en pantalla.' : `No lo he pillado. ¿Cuál de estas?`,
        opts,
        within.map(s => s.name),
        asks >= 2 ? 'No lo pillo. Toca una en pantalla.' : '¿Cuál?',
      );
    }
    return askService(
      asks >= 2 ? 'No lo pillo. Toca una en pantalla.' : `No he pillado el servicio. ¿Facial, corporal, láser…?`,
      cats,
      null,
      asks >= 2 ? 'No lo pillo. Toca una en pantalla.' : '¿Qué servicio?',
    );
  }

  const picked = found.service;

  if (startMin === null) {
    const holes = await firstFreeMins(providers, when, picked.duration_min);
    const timeAsks = asksFor('time');
    const shortAsk = timeAsks >= 1;
    const holeBit = holes.length && !shortAsk ? ` Tengo ${spoken(holes.map(fmt), 4)}.` : '';
    return {
      ok: true as const,
      ready: false as const,
      need: 'time' as const,
      pending: {
        who: whoLabel, startMin, dayOffset, providerQ, serviceQ: picked.name, need: 'time' as const,
        slotMins: holes,
        asks: timeAsks + 1,
        newClient: !client,
      },
      options: holes.map(fmt),
      href,
      say: shortAsk
        ? '¿A qué hora?'
        : `¿A qué hora le hacemos ${picked.name} a ${whoLabel}${whenBit}${withPro}?${holeBit}`,
      ear: shortAsk ? earAskTime(dayOffset) : earAskTimeHoles(dayOffset, holes),
    };
  }
  const service = picked;
  let providerId: string | null = null;
  for (const p of providers) {
    const slots = await freeSlots(p.id, when, service.duration_min);
    const mins = slots.map(minutesOfDay);
    if (mins.includes(startMin)) { providerId = p.id; break; }
  }
  if (!providerId) {
    const holes = await firstFreeMins(providers, when, service.duration_min);
    if (holes.length) {
      return {
        ok: true as const,
        ready: false as const,
        need: 'time' as const,
        pending: {
          who: whoLabel, startMin: null, dayOffset, providerQ, serviceQ: service.name, need: 'time' as const,
          slotMins: holes,
          newClient: !client,
        },
        options: holes.map(fmt),
        href,
        say: `Esa hora no está libre. Tengo ${spoken(holes.map(fmt), 4)}. ¿Cuál?`,
        ear: earHoraOcupada(holes),
      };
    }
    return { ok: false as const, ready: false as const, href, say: 'No queda hueco ese día. Abro el alta.' };
  }
  const newBit = client ? '' : ' (nueva)';
  return {
    ok: true as const,
    ready: true as const,
    href,
    say: `${whoLabel}${newBit}, ${whenLbl.toLowerCase()} a las ${fmt(startMin)}, ${service.name}${withPro}. ¿La guardo?`,
    ear: earAskSave(dayOffset, startMin),
    /** Para corregir «mejor a las doce» / «la de una hora» sin rehacer el diálogo. */
    book: { who: whoLabel, startMin, serviceQ: service.name, dayOffset, providerQ, newClient: !client },
    draft: {
      clientId: client?.id,
      clientName: client ? undefined : who,
      serviceId: service.id,
      providerId,
      date: dayKey(when),
      startMin,
      durationMin: service.duration_min,
      priceCents: service.price_cents,
    },
  };
}

export async function voiceConfirmBook(draft: {
  clientId?: string;
  clientName?: string;
  serviceId: string;
  providerId: string;
  date: string;
  startMin: number;
  durationMin: number;
  priceCents: number;
}) {
  const r = await createAppointment(draft);
  return {
    ok: r.ok,
    say: r.ok ? 'Cita guardada.' : (r.error ?? 'No se ha podido guardar'),
    ear: r.ok ? earSaved(offsetFromDay(draft.date), draft.startMin) : undefined,
    href: r.ok ? '/hoy' : '/agenda?new=1',
  };
}

export async function voicePreviewCancel(who: string, dayOffset = 0) {
  const { providers } = await scope();
  const { appointments } = await getDayAgenda(dateFromOffset(dayOffset), providers.map(p => p.id));
  const pool = appointments.filter(a => a.status === 'prog' || a.status === 'curso');
  const matches = rowsByClient(pool, who, a => a.client_label).map(a => ({
    id: a.id,
    label: `${a.client_label} · ${fmt(minutesOfDay(a.starts_at))} · ${a.service_name}`,
  }));
  if (!matches.length) {
    return {
      ok: false as const,
      say: `No hay cita de ${who} ${dayTitle(dayOffset)}.`,
      ear: 'No hay cita de esa clienta hoy.',
      matches: [],
    };
  }
  return {
    ok: true as const,
    say: matches.length === 1 ? `Cancelo ${matches[0].label}. ¿De acuerdo?` : 'Hay varias. ¿Cuál cancelo?',
    ear: matches.length === 1 ? '¿Lo cancelamos?' : undefined,
    matches,
  };
}

export async function voiceApplyCancel(id: string) {
  const r = await cancelAppointment(id);
  return { ok: r.ok, say: r.ok ? 'Cita cancelada.' : (r.error ?? 'No se ha podido cancelar'), href: '/hoy' };
}

export async function voicePreviewMove(
  who: string, startMin: number, dayOffset = 0, providerQ: string | null = null, apptId: string | null = null,
) {
  const { providers } = await scope();
  const { appointments } = await getDayAgenda(dateFromOffset(dayOffset), providers.map(p => p.id));
  const pool = appointments.filter(a => a.status === 'prog');
  const hits = apptId ? pool.filter(a => a.id === apptId) : rowsByClient(pool, who, a => a.client_label);
  if (hits.length === 0) {
    return {
      ok: false as const,
      say: `No encuentro a ${who} ${dayTitle(dayOffset)}.`,
      ear: 'No encuentro a esa clienta.',
      href: `/agenda${dayOffset ? `?day=${dayOffset}` : ''}`,
    };
  }
  if (hits.length > 1) {
    return {
      ok: true as const,
      say: 'Hay varias. ¿Cuál muevo?',
      ear: 'Hay varias. ¿Cuál es?',
      matches: hits.map(a => ({
        id: a.id,
        label: `${a.client_label} · ${fmt(minutesOfDay(a.starts_at))} · ${a.service_name}`,
      })),
      moveTo: { who, startMin, dayOffset, providerQ },
    };
  }
  const appt = hits[0];
  const dest = providerQ
    ? bestNameMatches(providers, providerQ, p => p.full_name)
    : providers.filter(p => p.id === appt.provider_id);
  const provider = dest[0] ?? providers.find(p => p.id === appt.provider_id);
  if (!provider) return { ok: false as const, say: 'No encuentro a esa profesional.', href: '/agenda' };
  const when = dateFromOffset(dayOffset);
  const slots = (await freeSlots(provider.id, when, appt.duration_min, appt.id)).map(minutesOfDay);
  if (!slots.includes(startMin)) {
    return { ok: false as const, say: `Esa hora no está libre con ${provider.full_name.split(' ')[0]}.`, href: '/agenda' };
  }
  return {
    ok: true as const,
    ready: true as const,
    say: `Paso a ${appt.client_label} ${dayTitle(dayOffset).toLowerCase()} a las ${fmt(startMin)} con ${provider.full_name.split(' ')[0]}. ¿De acuerdo?`,
    ear: earMove(dayOffset, startMin),
    draft: { id: appt.id, date: dayKey(when), startMin, providerId: provider.id },
  };
}

export async function voiceApplyMove(draft: { id: string; date: string; startMin: number; providerId: string }) {
  const r = await rescheduleAppointment(draft);
  return { ok: r.ok, say: r.ok ? 'Cita movida.' : (r.error ?? 'No se ha podido mover'), href: '/agenda' };
}

/** «Apunta a Lucía en espera»: quién es, antes de apuntar. */
export async function voicePreviewWait(who: string) {
  const clients = await listClientOptions();
  const r = resolveClient(clients, who);
  if (r.kind === 'one') {
    return {
      ok: true as const,
      say: `¿Apunto a ${r.client.full_name} en espera?`,
      ear: '¿Apunto en espera?',
      draft: { who: r.client.full_name, clientId: r.client.id },
    };
  }
  if (r.kind === 'several' || r.kind === 'similar') {
    const names = r.options.map(c => c.full_name);
    return {
      ok: true as const,
      say: r.kind === 'several' ? `¿${joinO(names)}?` : `No tengo a ${who}. ¿${joinO(names)}?`,
      ear: r.kind === 'several' ? 'Hay varias. ¿Cuál es?' : 'No la tengo. ¿Es alguna de estas?',
      matches: r.options.map(c => ({ id: c.id, label: c.full_name })),
      wait: true as const,
      draft: { who },
    };
  }
  return {
    ok: true as const,
    say: `${who} no está en fichas. ¿La apunto igual?`,
    ear: 'No está en fichas. ¿La apunto igual?',
    draft: { who },
  };
}

export async function voiceAddWait(who: string, clientId: string | null = null) {
  let id = clientId;
  let label = who;
  if (!id) {
    const clients = await listClientOptions();
    const r = resolveClient(clients, who);
    if (r.kind === 'one') { id = r.client.id; label = r.client.full_name; }
  } else {
    const clients = await listClientOptions();
    label = clients.find(c => c.id === id)?.full_name ?? who;
  }
  const r = await addToWaitlist(id ? { clientId: id } : { clientName: who });
  return {
    ok: r.ok,
    say: r.ok ? `${label} queda en espera.` : (r.error ?? 'No se ha podido apuntar'),
    href: '/agenda?wait=1',
  };
}
