'use server';

import { addToWaitlist } from '@/app/actions/clients';
import { createAppointment, updateStatus } from '@/app/actions/appointments';
import {
  freeSlots, getDayAgenda, listClientOptions, listProviders, listServices, requireSession,
} from '@/lib/queries';
import { dayKey, fmt, minutesOfDay } from '@/lib/time';
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

export async function voicePreviewBook(who: string, startMin: number | null, serviceQ: string | null) {
  const qs = new URLSearchParams({ new: '1', nombre: who });
  if (startMin !== null) qs.set('hora', fmt(startMin));
  if (serviceQ) qs.set('servicio', serviceQ);
  const href = `/agenda?${qs.toString()}`;

  if (startMin === null || !serviceQ) {
    return {
      ok: true as const,
      ready: false as const,
      href,
      say: 'Abro el alta; falta hora o servicio.',
    };
  }

  const { providers } = await scope();
  const [clients, services] = await Promise.all([listClientOptions(), listServices()]);
  const clientHits = bestNameMatches(clients, who, c => c.full_name);
  const serviceHits = bestNameMatches(services, serviceQ, s => s.name);
  if (serviceHits.length !== 1) {
    return { ok: true as const, ready: false as const, href, say: 'Abro el alta para elegir el servicio.' };
  }
  const service = serviceHits[0];
  let providerId: string | null = null;
  for (const p of providers) {
    const slots = await freeSlots(p.id, dayKey(new Date()), service.duration_min);
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
    say: `Cita de ${whoLabel} a las ${fmt(startMin)} de ${service.name}. ¿La guardo?`,
    draft: {
      clientId: client?.id,
      clientName: client ? undefined : who,
      serviceId: service.id,
      providerId,
      date: dayKey(new Date()),
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
