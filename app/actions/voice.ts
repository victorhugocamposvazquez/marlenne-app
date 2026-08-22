'use server';

import { addToWaitlist } from '@/app/actions/clients';
import { cancelAppointment, createAppointment, rescheduleAppointment, updateStatus } from '@/app/actions/appointments';
import {
  freeSlots, getDayAgenda, listClientOptions, listProviders, listServices, requireSession,
} from '@/lib/queries';
import { dateFromOffset, dayKey, dayTitle, fmt, minutesOfDay } from '@/lib/time';
import { bestNameMatches } from '@/lib/voice';

async function scope() {
  const me = await requireSession();
  const all = await listProviders();
  const providers = me.role === 'provider' ? all.filter(p => p.id === me.id) : all;
  return { me, providers };
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
    return { ok: true as const, say: `${verb}: ${matches[0].label}. ¿Lo hago?`, matches };
  }
  return { ok: true as const, say: `Hay varias. ¿Cuál?`, matches };
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
  const withPro = providerQ ? ` con ${providers[0].full_name.split(' ')[0]}` : '';

  if (startMin === null || !serviceQ) {
    const hora = startMin !== null ? ` a las ${fmt(startMin)}` : '';
    return {
      ok: true as const,
      ready: false as const,
      href,
      say: `Abro el alta de ${who} · ${whenLbl}${hora}${withPro}. Elige el servicio y guarda.`,
    };
  }

  const [clients, services] = await Promise.all([listClientOptions(), listServices()]);
  const clientHits = bestNameMatches(clients, who, c => c.full_name);
  const serviceHits = bestNameMatches(services, serviceQ, s => s.name);
  if (serviceHits.length !== 1) {
    return { ok: true as const, ready: false as const, href, say: `Abro el alta de ${who} · ${whenLbl}${withPro}. Elige el servicio.` };
  }
  const service = serviceHits[0];
  let providerId: string | null = null;
  for (const p of providers) {
    const slots = await freeSlots(p.id, when, service.duration_min);
    const mins = slots.map(minutesOfDay);
    if (mins.includes(startMin)) { providerId = p.id; break; }
  }
  if (!providerId) {
    return { ok: false as const, ready: false as const, href, say: 'Esa hora no está libre. Abro el alta.' };
  }
  const client = clientHits.length === 1 ? clientHits[0] : null;
  const whoLabel = client?.full_name ?? who;
  return {
    ok: true as const,
    ready: true as const,
    href,
    say: `Cita de ${whoLabel} ${whenLbl} a las ${fmt(startMin)} de ${service.name}${withPro}. ¿La guardo?`,
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
    say: matches.length === 1 ? `Cancelar ${matches[0].label}. ¿Lo hago?` : 'Hay varias. ¿Cuál cancelo?',
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
    say: `Mover a ${appt.client_label} ${dayTitle(dayOffset)} a las ${fmt(startMin)} con ${provider.full_name.split(' ')[0]}. ¿Lo hago?`,
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
