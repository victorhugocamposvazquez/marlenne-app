import { CATEGORIES, type CategoryId, type StatusId } from '@/lib/categories';
import { cell, parseCsv } from '@/lib/csv';
import { phoneDigits } from '@/lib/phone';
import { toTimestamp } from '@/lib/time';
import { bestNameMatches, fold, matchCategory } from '@/lib/voice';

export const MAX_IMPORT_ROWS = 2000;

export const CSV_TEMPLATES = {
  servicios: 'nombre,categoria,minutos,precio_euros\nLáser axilas,laser,20,25\nCavitación,corporal,45,40\n',
  clientas: 'nombre,telefono,email,notas,etiquetas\nAna Pérez,612480331,ana@correo.com,,VIP\n',
  citas: 'nombre_clienta,telefono,servicio,profesional,fecha,hora,estado,nota\nAna Pérez,612480331,Láser axilas,Marlenne,2026-09-08,11:00,prog,\n',
} as const;

export type ExistingService = { id: string; name: string; category: CategoryId; duration_min: number; price_cents: number };
export type ExistingClient = { id: string; full_name: string; phone: string | null };
export type ExistingStaff = { id: string; full_name: string; is_active?: boolean };
export type ExistingAppt = {
  provider_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};
export type ExistingBlock = { provider_id: string; starts_at: string; ends_at?: string; duration_min?: number };

export type PreviewService = {
  row: number;
  name: string;
  category: CategoryId;
  duration_min: number;
  price_cents: number;
  action: 'create' | 'skip';
  existingId?: string;
  error?: string;
};

export type PreviewClient = {
  row: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  action: 'create' | 'skip';
  existingId?: string;
  existingName?: string;
  error?: string;
};

export type PreviewAppointment = {
  row: number;
  client_name: string;
  phone: string | null;
  service_name: string;
  provider_name: string;
  date: string;
  startMin: number;
  duration_min: number;
  status: StatusId;
  note: string | null;
  action: 'create' | 'skip';
  skipReason?: string;
  clientId?: string;
  serviceId?: string;
  providerId?: string;
  starts_at?: string;
  ends_at?: string;
};

export type ImportPreview = {
  services: PreviewService[];
  clients: PreviewClient[];
  appointments: PreviewAppointment[];
  counts: {
    servicesNew: number;
    servicesSkip: number;
    clientsNew: number;
    clientsSkip: number;
    apptsNew: number;
    apptsSkip: number;
    apptsOverlap: number;
  };
  fileErrors: string[];
};

const STATUS_MAP: Record<string, StatusId> = {
  prog: 'prog', agendada: 'prog', pendiente: 'prog', booked: 'prog', cita: 'prog',
  curso: 'curso', cabina: 'curso', 'en cabina': 'curso',
  done: 'done', hecha: 'done', realizada: 'done', completed: 'done', terminada: 'done',
  noshow: 'noshow', 'no vino': 'noshow', 'no-show': 'noshow', falta: 'noshow', ausente: 'noshow',
};

function pick<T>(rows: T[], needle: string, label: (t: T) => string): T | 'none' | 'ambiguous' {
  const hits = bestNameMatches(rows, needle, label);
  if (hits.length === 0) return 'none';
  if (hits.length > 1) return 'ambiguous';
  return hits[0];
}

function phoneTail(s: string) {
  const d = phoneDigits(s);
  if (d.length >= 9) return d.slice(-9);
  return d.length >= 6 ? d : '';
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = iso[1];
    const m = iso[2].padStart(2, '0');
    const d = iso[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const eu = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (eu) {
    const d = eu[1].padStart(2, '0');
    const m = eu[2].padStart(2, '0');
    let y = eu[3];
    if (y.length === 2) y = Number(y) >= 70 ? `19${y}` : `20${y}`;
    return `${y}-${m}-${d}`;
  }
  return null;
}

function parseClock(raw: string): number | null {
  const s = raw.trim().replace('.', ':');
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function parseEuros(raw: string): number | null {
  const n = Number(raw.trim().replace('€', '').replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function parseCategory(raw: string): CategoryId | null {
  const t = fold(raw);
  if (!t) return null;
  if ((Object.keys(CATEGORIES) as CategoryId[]).includes(t as CategoryId)) return t as CategoryId;
  return matchCategory(t);
}

function parseStatus(raw: string): StatusId {
  const t = fold(raw);
  return STATUS_MAP[t] ?? 'prog';
}

function parseTags(raw: string): string[] {
  return raw.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
}

function addMinutesIso(iso: string, min: number) {
  return new Date(+new Date(iso) + min * 60_000).toISOString();
}

function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

function tooMany(n: number, kind: string): string | null {
  if (n > MAX_IMPORT_ROWS) return `${kind}: más de ${MAX_IMPORT_ROWS} filas. Parte el archivo.`;
  return null;
}

export function previewServices(csv: string, existing: ExistingService[]): PreviewService[] {
  const { rows } = parseCsv(csv);
  return rows.map((row, i) => {
    const name = cell(row, 'nombre', 'name', 'servicio', 'service');
    const catRaw = cell(row, 'categoria', 'category', 'tipo');
    const minRaw = cell(row, 'minutos', 'duration', 'duracion', 'min');
    const priceRaw = cell(row, 'precio_euros', 'precio', 'price', 'euros', 'precio_eur');
    const category = parseCategory(catRaw);
    const duration_min = Number(minRaw.replace(',', '.'));
    const price_cents = parseEuros(priceRaw) ?? 0;
    const base: PreviewService = {
      row: i + 2,
      name: name.trim(),
      category: category ?? 'corporal',
      duration_min: Number.isFinite(duration_min) ? Math.round(duration_min) : 0,
      price_cents,
      action: 'create',
    };
    if (base.name.length < 2) return { ...base, action: 'skip', error: 'Falta el nombre' };
    if (!category) return { ...base, action: 'skip', error: 'Categoría no reconocida' };
    if (!base.duration_min || base.duration_min < 5) return { ...base, action: 'skip', error: 'Minutos no válidos' };
    const hit = pick(existing, base.name, s => s.name);
    if (hit !== 'none' && hit !== 'ambiguous') {
      return { ...base, action: 'skip', existingId: hit.id, category: hit.category };
    }
    const dupInFile = rows.slice(0, i).some(prev => fold(cell(prev, 'nombre', 'name', 'servicio')) === fold(base.name));
    if (dupInFile) return { ...base, action: 'skip', error: 'Duplicado en el archivo' };
    return { ...base, category };
  });
}

export function previewClients(csv: string, existing: ExistingClient[]): PreviewClient[] {
  const { rows } = parseCsv(csv);
  const seenPhones = new Set<string>();
  return rows.map((row, i) => {
    const full_name = cell(row, 'nombre', 'name', 'full_name', 'clienta', 'cliente').trim();
    const phoneRaw = cell(row, 'telefono', 'phone', 'movil', 'tel');
    const phone = phoneRaw.trim() || null;
    const email = cell(row, 'email', 'correo').trim() || null;
    const notes = cell(row, 'notas', 'notes', 'note').trim() || null;
    const tags = parseTags(cell(row, 'etiquetas', 'tags', 'labels'));
    const base: PreviewClient = {
      row: i + 2,
      full_name,
      phone,
      email,
      notes,
      tags,
      action: 'create',
    };
    if (full_name.length < 2) return { ...base, action: 'skip', error: 'Falta el nombre' };
    const tail = phone ? phoneTail(phone) : '';
    if (tail.length >= 9) {
      if (seenPhones.has(tail)) return { ...base, action: 'skip', error: 'Teléfono duplicado en el archivo' };
      seenPhones.add(tail);
      const hit = existing.find(c => phoneDigits(c.phone ?? '').endsWith(tail));
      if (hit) {
        return { ...base, action: 'skip', existingId: hit.id, existingName: hit.full_name };
      }
    }
    const nameHit = existing.filter(c => fold(c.full_name) === fold(full_name));
    if (nameHit.length === 1 && !tail) {
      return { ...base, action: 'skip', existingId: nameHit[0].id, existingName: nameHit[0].full_name };
    }
    return base;
  });
}

type Catalog = {
  services: ExistingService[];
  clients: ExistingClient[];
  staff: ExistingStaff[];
  appointments: ExistingAppt[];
  blocks: ExistingBlock[];
  pendingServices: PreviewService[];
  pendingClients: PreviewClient[];
};

function resolveClient(name: string, phone: string | null, cat: Catalog): { id?: string; error?: string } {
  const tail = phone ? phoneTail(phone) : '';
  if (tail.length >= 9) {
    const hit = cat.clients.find(c => phoneDigits(c.phone ?? '').endsWith(tail));
    if (hit) return { id: hit.id };
    const pending = cat.pendingClients.find(c => c.action === 'create' && c.phone && phoneTail(c.phone) === tail);
    if (pending) return { id: `new-cli:${pending.row}` };
  }
  if (name.trim().length >= 2) {
    const hit = pick(cat.clients, name, c => c.full_name);
    if (hit !== 'none' && hit !== 'ambiguous') return { id: hit.id };
    if (hit === 'ambiguous') return { error: 'Varias clientas con ese nombre; pon teléfono' };
    const pending = cat.pendingClients.filter(c => c.action === 'create' && fold(c.full_name) === fold(name));
    if (pending.length === 1) return { id: `new-cli:${pending[0].row}` };
    if (pending.length > 1) return { error: 'Varias clientas nuevas con ese nombre; pon teléfono' };
  }
  return { error: 'Clienta no encontrada. Impórtala antes.' };
}

function resolveService(name: string, cat: Catalog): { id?: string; duration?: number; error?: string } {
  const hit = pick(cat.services, name, s => s.name);
  if (hit !== 'none' && hit !== 'ambiguous') return { id: hit.id, duration: hit.duration_min };
  if (hit === 'ambiguous') return { error: 'Varios servicios coinciden' };
  const pending = cat.pendingServices.filter(s => s.action === 'create' && fold(s.name) === fold(name));
  if (pending.length === 1) return { id: `new-svc:${pending[0].row}`, duration: pending[0].duration_min };
  const fuzzy = cat.pendingServices.filter(s => s.action === 'create' && fold(s.name).includes(fold(name)));
  if (fuzzy.length === 1) return { id: `new-svc:${fuzzy[0].row}`, duration: fuzzy[0].duration_min };
  return { error: 'Servicio no encontrado. Impórtalo o créalo en el catálogo.' };
}

function resolveStaff(name: string, staff: ExistingStaff[]): { id?: string; error?: string } {
  const active = staff.filter(s => s.is_active !== false);
  const hit = pick(active.length ? active : staff, name, s => s.full_name);
  if (hit !== 'none' && hit !== 'ambiguous') return { id: hit.id };
  if (hit === 'ambiguous') return { error: 'Varias profesionales coinciden' };
  return { error: 'Profesional no encontrada. No se crean logins desde el CSV.' };
}

function blockEnd(b: ExistingBlock) {
  if (b.ends_at) return b.ends_at;
  return addMinutesIso(b.starts_at, b.duration_min ?? 0);
}

export function previewAppointments(csv: string, cat: Catalog): PreviewAppointment[] {
  const { rows } = parseCsv(csv);
  const accepted: PreviewAppointment[] = [];
  return rows.map((row, i) => {
    const client_name = cell(row, 'nombre_clienta', 'clienta', 'cliente', 'nombre', 'name').trim();
    const phone = cell(row, 'telefono', 'phone', 'movil', 'tel').trim() || null;
    const service_name = cell(row, 'servicio', 'service').trim();
    const provider_name = cell(row, 'profesional', 'provider', 'staff', 'con').trim();
    const dateRaw = cell(row, 'fecha', 'date', 'dia');
    const horaRaw = cell(row, 'hora', 'time', 'hour');
    const minRaw = cell(row, 'minutos', 'duration', 'duracion');
    const status = parseStatus(cell(row, 'estado', 'status'));
    const note = cell(row, 'nota', 'note', 'notes').trim() || null;
    const date = parseDate(dateRaw);
    const startMin = parseClock(horaRaw);
    const csvMins = Number(minRaw.replace(',', '.'));
    const base: PreviewAppointment = {
      row: i + 2,
      client_name,
      phone,
      service_name,
      provider_name,
      date: date ?? dateRaw,
      startMin: startMin ?? 0,
      duration_min: Number.isFinite(csvMins) && csvMins >= 5 ? Math.round(csvMins) : 0,
      status,
      note,
      action: 'create',
    };
    if (client_name.length < 2) return { ...base, action: 'skip', skipReason: 'Falta la clienta' };
    if (!service_name) return { ...base, action: 'skip', skipReason: 'Falta el servicio' };
    if (!provider_name) return { ...base, action: 'skip', skipReason: 'Falta la profesional' };
    if (!date) return { ...base, action: 'skip', skipReason: 'Fecha no válida (usa YYYY-MM-DD o DD/MM/YYYY)' };
    if (startMin == null) return { ...base, action: 'skip', skipReason: 'Hora no válida (usa HH:MM)' };

    const client = resolveClient(client_name, phone, cat);
    if (client.error || !client.id) return { ...base, action: 'skip', skipReason: client.error };
    const service = resolveService(service_name, cat);
    if (service.error || !service.id) return { ...base, action: 'skip', skipReason: service.error };
    const provider = resolveStaff(provider_name, cat.staff);
    if (provider.error || !provider.id) return { ...base, action: 'skip', skipReason: provider.error };

    const duration_min = base.duration_min || service.duration || 0;
    if (!duration_min) return { ...base, action: 'skip', skipReason: 'Sin duración' };

    const starts_at = toTimestamp(date, startMin);
    const ends_at = addMinutesIso(starts_at, duration_min);

    const busy = status !== 'noshow' && (
      cat.appointments.some(a =>
        a.provider_id === provider.id && a.status !== 'noshow' && overlap(starts_at, ends_at, a.starts_at, a.ends_at),
      )
      || cat.blocks.some(b =>
        b.provider_id === provider.id && overlap(starts_at, ends_at, b.starts_at, blockEnd(b)),
      )
      || accepted.some(a =>
        a.action === 'create' && a.providerId === provider.id && a.status !== 'noshow'
        && a.starts_at && a.ends_at && overlap(starts_at, ends_at, a.starts_at, a.ends_at),
      )
    );
    const next: PreviewAppointment = {
      ...base,
      date,
      startMin,
      duration_min,
      clientId: client.id,
      serviceId: service.id,
      providerId: provider.id,
      starts_at,
      ends_at,
      action: busy ? 'skip' : 'create',
      skipReason: busy ? 'Pisa otra cita o un bloqueo' : undefined,
    };
    if (next.action === 'create') accepted.push(next);
    return next;
  });
}

export function buildPreview(input: {
  servicesCsv?: string;
  clientsCsv?: string;
  appointmentsCsv?: string;
  existing: {
    services: ExistingService[];
    clients: ExistingClient[];
    staff: ExistingStaff[];
    appointments: ExistingAppt[];
    blocks: ExistingBlock[];
  };
}): ImportPreview {
  const fileErrors: string[] = [];
  const services = input.servicesCsv ? previewServices(input.servicesCsv, input.existing.services) : [];
  const clients = input.clientsCsv ? previewClients(input.clientsCsv, input.existing.clients) : [];
  const tooS = tooMany(services.length, 'Servicios');
  const tooC = tooMany(clients.length, 'Clientas');
  if (tooS) fileErrors.push(tooS);
  if (tooC) fileErrors.push(tooC);

  let appointments: PreviewAppointment[] = [];
  if (input.appointmentsCsv) {
    const parsed = parseCsv(input.appointmentsCsv).rows.length;
    const tooA = tooMany(parsed, 'Citas');
    if (tooA) fileErrors.push(tooA);
    else {
      appointments = previewAppointments(input.appointmentsCsv, {
        ...input.existing,
        pendingServices: services,
        pendingClients: clients,
      });
    }
  }

  if (!input.servicesCsv && !input.clientsCsv && !input.appointmentsCsv) {
    fileErrors.push('Elige al menos un CSV.');
  }

  const apptsOverlap = appointments.filter(a => a.skipReason?.startsWith('Pisa')).length;
  return {
    services,
    clients,
    appointments,
    counts: {
      servicesNew: services.filter(s => s.action === 'create').length,
      servicesSkip: services.filter(s => s.action === 'skip').length,
      clientsNew: clients.filter(c => c.action === 'create').length,
      clientsSkip: clients.filter(c => c.action === 'skip').length,
      apptsNew: appointments.filter(a => a.action === 'create').length,
      apptsSkip: appointments.filter(a => a.action === 'skip').length,
      apptsOverlap,
    },
    fileErrors,
  };
}

export function peekAppointmentDates(csv: string) {
  const { rows } = parseCsv(csv);
  const dates = rows
    .map(row => parseDate(cell(row, 'fecha', 'date', 'dia')))
    .filter((d): d is string => !!d)
    .sort();
  if (!dates.length) return null;
  return { from: dates[0], to: dates[dates.length - 1] };
}
