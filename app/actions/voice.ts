'use server';

import { addToWaitlist } from '@/app/actions/clients';
import { cancelAppointment, createAppointment, rescheduleAppointment, updateStatus } from '@/app/actions/appointments';
import { requireSession } from '@/lib/require-session';
import {
  freeSlots, getDayAgenda, listClientOptions, listProviders, listServices,
} from '@/lib/queries';
import { CATEGORIES } from '@/lib/categories';
import { dateFromOffset, dayKey, dayTitle, fmt, minutesOfDay } from '@/lib/time';
import { bestNameMatches, bestServiceMatches, matchCategory, saidServiceVariant, serviceFamily } from '@/lib/voice';

export type PendingBook = {
  who: string;
  startMin: number | null;
  dayOffset: number;
  providerQ: string | null;
  serviceQ: string | null;
  need: 'service' | 'time';
  choices?: string[];
  slotMins?: number[];
};

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

/** Si el dictado es solo el nombre de una clienta, empezamos cita. */
export async function voiceMatchClient(q: string) {
  const clients = await listClientOptions();
  const hits = bestNameMatches(clients, q.trim(), c => c.full_name);
  return hits.length === 1 ? hits[0].full_name : null;
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
  return { ok: true as const, say: bits.join(' '), href: '/hoy' };
}

export async function voicePreviewStatus(who: string, status: 'curso' | 'noshow') {
  const { providers } = await scope();
  const { appointments } = await getDayAgenda(new Date(), providers.map(p => p.id));
  const pool = appointments.filter(a => status === 'curso'
    ? a.status === 'prog'
    : a.status === 'prog' || a.status === 'curso');
  const matches = bestNameMatches(pool, who, a => a.client_label).map(a => ({
    id: a.id,
    label: `${a.client_label} · ${fmt(minutesOfDay(a.starts_at))} · ${a.service_name}`,
  }));
  if (matches.length === 0) {
    return { ok: false as const, say: `No encuentro a ${who} en la agenda de hoy.`, matches: [] };
  }
  const verb = status === 'curso' ? 'Pasa a cabina' : 'No vino';
  if (matches.length === 1) {
    return { ok: true as const, say: `${verb}: ${matches[0].label}. ¿Lo marco?`, matches };
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
  dayOffset = 0, startMin: number | null = null, providerQ: string | null = null,
) {
  const { providers } = await scope();
  const when = dateFromOffset(dayOffset);
  const whenLbl = dayTitle(dayOffset);
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
      return { ok: true as const, say: `Nadie libre ${whenLbl} a las ${fmt(startMin)}.`, href };
    }
    return {
      ok: true as const,
      say: `${free.join(', ')} ${free.length === 1 ? 'está libre' : 'están libres'} ${whenLbl} a las ${fmt(startMin)}.`,
      href,
    };
  }

  const lines: string[] = [];
  for (const p of pool) {
    const slots = (await freeSlots(p.id, when, 60)).map(minutesOfDay).slice(0, 4);
    if (slots.length) lines.push(`${p.full_name.split(' ')[0]}: ${slots.map(fmt).join(', ')}`);
  }
  if (!lines.length) return { ok: true as const, say: `No quedan huecos de una hora ${whenLbl}.`, href };
  return { ok: true as const, say: `Huecos ${whenLbl}. ${lines.join('. ')}.`, href };
}

export async function voicePreviewBook(
  who: string, startMin: number | null, serviceQ: string | null, dayOffset = 0, providerQ: string | null = null,
  choices: string[] | null = null,
) {
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
  const askService = (
    say: string,
    options: string[],
    q: string | null = serviceQ,
    lockChoices = false,
  ) => ({
    ok: true as const,
    ready: false as const,
    need: 'service' as const,
    pending: {
      who, startMin, dayOffset, providerQ, serviceQ: q, need: 'service' as const,
      choices: lockChoices ? options : undefined,
    },
    options,
    href,
    say,
  });

  const [clients, allServices] = await Promise.all([listClientOptions(), listServices()]);
  const clientHits = bestNameMatches(clients, who, c => c.full_name);
  const whoLabel = clientHits.length === 1 ? clientHits[0].full_name : who;
  const fromList = choices?.length
    ? allServices.filter(s => choices.some(c => c.toLowerCase() === s.name.toLowerCase()))
    : [];
  const services = fromList.length ? fromList : allServices;

  if (!serviceQ) {
    return askService(`¿Qué le hacemos a ${whoLabel}?`, cats, null, false);
  }

  const exact = services.filter(s => s.name.localeCompare(serviceQ, 'es', { sensitivity: 'accent' }) === 0
    || s.name.toLowerCase() === serviceQ.toLowerCase());
  let picked = exact.length === 1 ? exact[0] : null;

  if (!picked) {
    const named = bestServiceMatches(services, serviceQ, s => s.name);
    if (named.length === 1) picked = named[0];
    else if (named.length > 1) {
      const names = named.map(s => s.name);
      return askService(`Hay varias. ${spoken(names)}. ¿Cuál le hacemos a ${whoLabel}?`, names, serviceQ, true);
    }
  }

  if (!picked) {
    const cat = matchCategory(serviceQ);
    if (cat) {
      const inCat = (fromList.length ? allServices : services).filter(s => s.category === cat);
      if (inCat.length === 1) picked = inCat[0];
      else if (inCat.length > 1) {
        const names = inCat.map(s => s.name);
        return askService(
          `En ${CATEGORIES[cat].label.toLowerCase()} tengo ${spoken(names)}. ¿Cuál le hacemos a ${whoLabel}?`,
          names,
          null,
          true,
        );
      } else {
        return askService(`No hay servicios de ${CATEGORIES[cat].label}. ¿Otra categoría?`, cats, null, false);
      }
    }
  }

  if (!picked && fromList.length) {
    const named = bestServiceMatches(allServices, serviceQ, s => s.name);
    if (named.length === 1) picked = named[0];
    else if (named.length > 1) {
      const names = named.map(s => s.name);
      return askService(`Hay varias. ${spoken(names)}. ¿Cuál le hacemos a ${whoLabel}?`, names, serviceQ, true);
    }
  }

  if (!picked) {
    const corporal = allServices.filter(s => s.category === 'corporal').map(s => s.name);
    return askService(
      `No he pillado el servicio. Prueba otra vez, o elige: ${spoken(corporal)}.`,
      corporal.length ? corporal : cats,
      null,
      false,
    );
  }

  const kin = serviceFamily(picked.name, allServices, s => s.name);
  if (kin.length > 1 && !saidServiceVariant(serviceQ)) {
    const names = kin.map(s => s.name);
    const bits = names.map(n => {
      if (/\+\s*cavit/i.test(n)) return 'con cavitación';
      if (/1 hora/i.test(n)) return 'de una hora';
      if (/2 h/i.test(n)) return 'de dos horas';
      return 'de media hora';
    });
    const family = picked.name.replace(/\s*[-+–].*$/, '').trim();
    return askService(
      `Tengo ${family} ${spoken(bits, 4)}. ¿Cuál le hacemos a ${whoLabel}?`,
      names,
      serviceQ,
      true,
    );
  }

  if (startMin === null) {
    const holes = await firstFreeMins(providers, when, picked.duration_min);
    const holeBit = holes.length ? ` Tengo ${spoken(holes.map(fmt), 4)}.` : '';
    return {
      ok: true as const,
      ready: false as const,
      need: 'time' as const,
      pending: {
        who, startMin, dayOffset, providerQ, serviceQ: picked.name, need: 'time' as const,
        slotMins: holes,
      },
      options: holes.map(fmt),
      href,
      say: `¿A qué hora le hacemos ${picked.name} a ${whoLabel}${whenBit}${withPro}?${holeBit}`,
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
          who, startMin: null, dayOffset, providerQ, serviceQ: service.name, need: 'time' as const,
          slotMins: holes,
        },
        options: holes.map(fmt),
        href,
        say: `Esa hora no está libre. Tengo ${spoken(holes.map(fmt), 4)}. ¿Cuál?`,
      };
    }
    return { ok: false as const, ready: false as const, href, say: 'No queda hueco ese día. Abro el alta.' };
  }
  const client = clientHits.length === 1 ? clientHits[0] : null;
  return {
    ok: true as const,
    ready: true as const,
    href,
    say: `${whoLabel}, ${whenLbl.toLowerCase()} a las ${fmt(startMin)}, ${service.name}${withPro}. ¿La guardo?`,
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
    href: r.ok ? '/hoy' : '/agenda?new=1',
  };
}

export async function voicePreviewCancel(who: string, dayOffset = 0) {
  const { providers } = await scope();
  const { appointments } = await getDayAgenda(dateFromOffset(dayOffset), providers.map(p => p.id));
  const pool = appointments.filter(a => a.status === 'prog' || a.status === 'curso');
  const matches = bestNameMatches(pool, who, a => a.client_label).map(a => ({
    id: a.id,
    label: `${a.client_label} · ${fmt(minutesOfDay(a.starts_at))} · ${a.service_name}`,
  }));
  if (!matches.length) {
    return { ok: false as const, say: `No hay cita de ${who} ${dayTitle(dayOffset)}.`, matches: [] };
  }
  return {
    ok: true as const,
    say: matches.length === 1 ? `Cancelo ${matches[0].label}. ¿De acuerdo?` : 'Hay varias. ¿Cuál cancelo?',
    matches,
  };
}

export async function voiceApplyCancel(id: string) {
  const r = await cancelAppointment(id);
  return { ok: r.ok, say: r.ok ? 'Cita cancelada.' : (r.error ?? 'No se ha podido cancelar'), href: '/hoy' };
}

export async function voicePreviewMove(
  who: string, startMin: number, dayOffset = 0, providerQ: string | null = null,
) {
  const { providers } = await scope();
  const { appointments } = await getDayAgenda(dateFromOffset(dayOffset), providers.map(p => p.id));
  const hits = bestNameMatches(appointments.filter(a => a.status === 'prog'), who, a => a.client_label);
  if (hits.length !== 1) {
    return {
      ok: false as const,
      say: hits.length === 0 ? `No encuentro a ${who} ${dayTitle(dayOffset)}.` : 'Hay varias citas. Abre la agenda.',
      href: `/agenda${dayOffset ? `?day=${dayOffset}` : ''}`,
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
    draft: { id: appt.id, date: dayKey(when), startMin, providerId: provider.id },
  };
}

export async function voiceApplyMove(draft: { id: string; date: string; startMin: number; providerId: string }) {
  const r = await rescheduleAppointment(draft);
  return { ok: r.ok, say: r.ok ? 'Cita movida.' : (r.error ?? 'No se ha podido mover'), href: '/agenda' };
}

export async function voiceAddWait(who: string) {
  const clients = await listClientOptions();
  const hits = bestNameMatches(clients, who, c => c.full_name);
  const r = await addToWaitlist(
    hits.length === 1
      ? { clientId: hits[0].id }
      : { clientName: who },
  );
  return {
    ok: r.ok,
    say: r.ok ? `${hits[0]?.full_name ?? who} queda en espera.` : (r.error ?? 'No se ha podido apuntar'),
    href: '/agenda?wait=1',
  };
}
