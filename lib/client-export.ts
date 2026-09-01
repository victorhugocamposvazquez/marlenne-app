import { STATUS } from '@/lib/categories';
import { CONSENT_KINDS, consentExpired, latestConsents, type ConsentKind } from '@/lib/consents';
import { dateLbl, dayKey, shortWhen } from '@/lib/time';
import type { AgendaAppt, ClientPack, ClientRow, Consent, TreatmentRow } from '@/lib/types';

function slugName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'ficha';
}

export function fichaFileName(fullName: string, when = new Date()) {
  return `ficha-${slugName(fullName)}-${dayKey(when)}.txt`;
}

/** Copia en texto de la ficha (art. 15). Las fotos no van en el archivo. */
export function formatClientFicha(input: {
  client: ClientRow;
  treatments: TreatmentRow[];
  packs?: ClientPack[];
  appointments: AgendaAppt[];
  consents: Consent[];
}) {
  const { client, treatments, packs = [], appointments, consents } = input;
  const photos = treatments.flatMap(t => t.treatment_photos ?? []);
  const latest = latestConsents(consents);
  const lines: string[] = [
    'Marlenne — copia de ficha',
    `Generada: ${dateLbl(new Date().toISOString())}`,
    '',
    'Datos',
    `Nombre: ${client.full_name}`,
    `Teléfono: ${client.phone || '—'}`,
    `Email: ${client.email || '—'}`,
    `Nacimiento: ${client.birth_date ? dateLbl(client.birth_date) : '—'}`,
    `Alta: ${dateLbl(client.created_at)}`,
    `Etiquetas: ${client.tags?.length ? client.tags.join(', ') : '—'}`,
    `SMS: ${client.sms_opt_in ? 'sí' : 'no'}`,
    `Notas internas: ${client.notes?.trim() || '—'}`,
    '',
    'Consentimientos',
  ];

  (Object.keys(CONSENT_KINDS) as ConsentKind[]).forEach(kind => {
    const row = latest.get(kind);
    if (!row) {
      lines.push(`- ${CONSENT_KINDS[kind]}: no consta`);
      return;
    }
    const until = row.expires_at
      ? (consentExpired(row) ? `caducado ${dateLbl(row.expires_at)}` : `hasta ${dateLbl(row.expires_at)}`)
      : 'sin caducidad';
    lines.push(`- ${CONSENT_KINDS[kind]}: ${dateLbl(row.signed_at)} (${until})`);
  });

  lines.push('', 'Bonos');
  if (!packs.length) lines.push('- Ninguno');
  for (const p of packs) {
    const friend = p.friend_name ? ` · pack amigo con ${p.friend_name}` : '';
    const owner = p.owner_client_id !== client.id ? ` · de ${p.owner_name}` : '';
    const exp = p.expires_at ? ` · caduca ${dateLbl(p.expires_at)}` : '';
    lines.push(`- ${p.name}: ${p.sessions_done}/${p.sessions_total} usadas${friend}${owner}${exp}`);
  }

  lines.push('', 'Tratamientos');
  if (!treatments.length) lines.push('- Ninguno');
  for (const t of treatments) {
    const svc = t.service?.name ?? 'Tratamiento';
    const who = t.provider?.full_name ? ` · ${t.provider.full_name}` : '';
    const closed = t.closed_at ? `cerrado ${dateLbl(t.closed_at)}` : 'abierto';
    lines.push(`- ${svc}${t.zone ? ` · ${t.zone}` : ''}: ${t.sessions_done}/${t.sessions_total} sesiones, ${closed}${who}`);
    if (t.note?.trim()) lines.push(`  Nota: ${t.note.trim()}`);
    const params = Object.entries(t.last_params ?? {}).filter(([, v]) => v);
    if (params.length) {
      lines.push(`  Parámetros: ${params.map(([k, v]) => `${k} ${v}`).join(', ')}`);
    }
    for (const m of t.measurements ?? []) {
      const val = m.value_num != null ? `${m.value_num}${m.unit ? ` ${m.unit}` : ''}` : (m.value_text ?? '');
      lines.push(`  Medida ${m.metric}: ${val} (${dateLbl(m.measured_at)})`);
    }
  }

  lines.push('', `Fotos en ficha: ${photos.length}`);
  if (photos.length) {
    lines.push('Las imágenes no van en este archivo; están en el centro. Se entregan aparte si las pide.');
    for (const p of photos) {
      lines.push(`- ${p.kind === 'before' ? 'Antes' : 'Después'}${p.zone ? ` · ${p.zone}` : ''} · ${dateLbl(p.taken_at)}`);
    }
  }

  lines.push('', 'Citas');
  if (!appointments.length) lines.push('- Ninguna');
  for (const a of [...appointments].sort((x, y) => +new Date(x.starts_at) - +new Date(y.starts_at))) {
    const price = a.price_cents != null ? ` · ${a.price_cents / 100} €` : '';
    lines.push(
      `- ${shortWhen(a.starts_at)} · ${a.service_name} · ${STATUS[a.status].label} · ${a.provider_name}${price}`,
    );
    if (a.note?.trim()) lines.push(`  Nota: ${a.note.trim()}`);
  }

  lines.push('', 'Datos de salud (RGPD art. 9). Solo para el tratamiento en este centro.');
  return lines.join('\n');
}
