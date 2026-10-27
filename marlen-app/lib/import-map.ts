import { cell, normHeader, parseCsv } from '@/lib/csv';

/** Campos canónicos que entiende el motor de importación. */
export type ImportRole =
  | 'ignore'
  | 'client_name'
  | 'client_first'
  | 'client_last'
  | 'phone'
  | 'email'
  | 'service'
  | 'staff'
  | 'date'
  | 'time'
  | 'time_end'
  | 'duration'
  | 'status'
  | 'note';

export type ColumnMap = Record<string, ImportRole>;

export type EntityMap = Record<string, string>;

export const IMPORT_ROLES: { id: ImportRole; label: string }[] = [
  { id: 'ignore', label: 'Ignorar' },
  { id: 'client_name', label: 'Nombre clienta' },
  { id: 'client_first', label: 'Nombre' },
  { id: 'client_last', label: 'Apellidos' },
  { id: 'phone', label: 'Teléfono' },
  { id: 'email', label: 'Email' },
  { id: 'service', label: 'Servicio' },
  { id: 'staff', label: 'Profesional' },
  { id: 'date', label: 'Fecha' },
  { id: 'time', label: 'Hora (o rango)' },
  { id: 'time_end', label: 'Hora fin' },
  { id: 'duration', label: 'Duración (min)' },
  { id: 'status', label: 'Estado' },
  { id: 'note', label: 'Nota' },
];

const ROLE_HINTS: Record<Exclude<ImportRole, 'ignore'>, string[]> = {
  client_name: [
    'nombre_de_cliente', 'nombre_cliente', 'nombre_clienta', 'client_name',
    'nombre_completo', 'full_name', 'clienta', 'cliente', 'contacto', 'paciente', 'customer',
  ],
  client_first: ['nombre', 'first_name', 'firstname'],
  client_last: ['apellidos', 'apellido', 'last_name', 'surname'],
  phone: [
    'telefono', 'telefono_del_cliente', 'phone', 'movil', 'mobile', 'tel', 'celular',
    'whatsapp', 'telefono_movil', 'numero_telefono',
  ],
  email: ['email', 'correo', 'e_mail', 'mail'],
  service: ['servicio', 'service', 'tratamiento', 'concepto', 'event', 'booking_service'],
  staff: [
    'unidad', 'profesional', 'provider', 'staff', 'empleado', 'cabina', 'recurso',
    'trabajador', 'worker', 'employee', 'con', 'therapist', 'especialista',
  ],
  date: ['fecha', 'date', 'dia', 'fecha_cita', 'booking_date', 'day'],
  time: [
    'hora', 'time', 'hour', 'hora_inicio', 'hora_cita', 'start_time', 'from', 'inicio',
  ],
  time_end: ['hora_fin', 'end_time', 'hasta', 'fin', 'to'],
  duration: ['minutos', 'duration', 'duracion', 'duracion_minutos', 'mins', 'length'],
  status: ['estado', 'status', 'situacion'],
  note: ['nota', 'note', 'notes', 'observaciones', 'comentarios'],
};

function scoreHeader(header: string, hints: string[]): number {
  const h = normHeader(header);
  if (!h) return 0;
  for (const hint of hints) {
    const n = normHeader(hint);
    if (h === n) return 100;
    if (h.startsWith(n) || n.startsWith(h)) return 80;
    if (h.includes(n) || n.includes(h)) return 60;
  }
  return 0;
}

/** Sugiere un rol por columna según cabeceras típicas (SimplyBook, Treatwell, Excel…). */
export function suggestColumnMap(headers: string[]): ColumnMap {
  const used = new Set<ImportRole>();
  const out: ColumnMap = {};
  const roles = Object.keys(ROLE_HINTS) as Exclude<ImportRole, 'ignore'>[];

  for (const header of headers) {
    let best: ImportRole = 'ignore';
    let bestScore = 0;
    for (const role of roles) {
      if (used.has(role) && role !== 'ignore') continue;
      const score = scoreHeader(header, ROLE_HINTS[role]);
      if (score > bestScore) {
        bestScore = score;
        best = role;
      }
    }
    // "nombre" solo: preferir client_name si no hay nombre_completo
    if (best === 'client_first' && !headers.some(h => scoreHeader(h, ROLE_HINTS.client_name) >= 60)) {
      if (scoreHeader(header, ['nombre']) >= 60) best = 'client_name';
    }
    out[header] = bestScore >= 60 ? best : 'ignore';
    if (out[header] !== 'ignore') used.add(out[header]);
  }
  return out;
}

export function parseTimeRange(raw: string): { startMin: number; endMin: number | null } | null {
  const s = raw.trim().replace(/\./g, ':');
  const range = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*[-–—a]\s*(\d{1,2}):(\d{2})(?::\d{2})?$/i);
  if (range) {
    const startMin = Number(range[1]) * 60 + Number(range[2]);
    const endMin = Number(range[3]) * 60 + Number(range[4]);
    if (startMin > 23 * 60 + 59 || endMin > 23 * 60 + 59) return null;
    return { startMin, endMin: endMin > startMin ? endMin : null };
  }
  const single = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!single) return null;
  const startMin = Number(single[1]) * 60 + Number(single[2]);
  if (startMin > 23 * 60 + 59) return null;
  return { startMin, endMin: null };
}

function csvEscape(v: string) {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function rowValue(row: Record<string, string>, map: ColumnMap, role: ImportRole): string {
  for (const [header, mapped] of Object.entries(map)) {
    if (mapped === role && row[header]?.trim()) return row[header].trim();
  }
  return '';
}

function clientNameFromMap(row: Record<string, string>, map: ColumnMap): string {
  const direct = rowValue(row, map, 'client_name');
  if (direct.length >= 2) return direct;
  const first = rowValue(row, map, 'client_first');
  const last = rowValue(row, map, 'client_last');
  return [first, last].filter(Boolean).join(' ').trim();
}

function durationFromRow(row: Record<string, string>, map: ColumnMap): number | null {
  const durRaw = rowValue(row, map, 'duration');
  if (durRaw) {
    const n = Number(durRaw.replace(',', '.').replace(/[^\d.]/g, ''));
    if (Number.isFinite(n) && n >= 5) return Math.round(n);
  }
  const timeRaw = rowValue(row, map, 'time');
  const endRaw = rowValue(row, map, 'time_end');
  const parsed = parseTimeRange(timeRaw);
  if (parsed?.endMin != null) return parsed.endMin - parsed.startMin;
  if (parsed && endRaw) {
    const end = parseTimeRange(endRaw);
    if (end && end.startMin > parsed.startMin) return end.startMin - parsed.startMin;
  }
  return null;
}

function startClockFromRow(row: Record<string, string>, map: ColumnMap): string {
  const timeRaw = rowValue(row, map, 'time');
  const parsed = parseTimeRange(timeRaw);
  if (!parsed) return timeRaw;
  const h = Math.floor(parsed.startMin / 60);
  const m = parsed.startMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Reescribe el CSV a cabeceras canónicas de Marlén según el mapa del usuario. */
export function applyColumnMapToCsv(csv: string, map: ColumnMap): string {
  const { rows } = parseCsv(csv);
  const header = [
    'nombre_clienta', 'telefono', 'email', 'servicio', 'profesional',
    'fecha', 'hora', 'minutos', 'estado', 'nota',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    const mins = durationFromRow(row, map);
    let phone = rowValue(row, map, 'phone');
    if (phone.startsWith("'")) phone = phone.slice(1).trim();
    const cells = [
      clientNameFromMap(row, map),
      phone,
      rowValue(row, map, 'email'),
      rowValue(row, map, 'service'),
      rowValue(row, map, 'staff'),
      rowValue(row, map, 'date'),
      startClockFromRow(row, map),
      mins != null ? String(mins) : '',
      rowValue(row, map, 'status'),
      rowValue(row, map, 'note'),
    ].map(csvEscape);
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}

/** Renombra valores de servicio/profesional tras el mapa de columnas. */
export function applyEntityMapsToCsv(
  canonicalCsv: string,
  serviceMap: EntityMap,
  staffMap: EntityMap,
): string {
  const { rows } = parseCsv(canonicalCsv);
  const header = [
    'nombre_clienta', 'telefono', 'email', 'servicio', 'profesional',
    'fecha', 'hora', 'minutos', 'estado', 'nota',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    const svc = cell(row, 'servicio').trim();
    const staff = cell(row, 'profesional').trim();
    const cells = [
      cell(row, 'nombre_clienta'),
      cell(row, 'telefono'),
      cell(row, 'email'),
      serviceMap[svc] ?? svc,
      staffMap[staff] ?? staff,
      cell(row, 'fecha'),
      cell(row, 'hora'),
      cell(row, 'minutos'),
      cell(row, 'estado'),
      cell(row, 'nota'),
    ].map(csvEscape);
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}

export function uniqueMappedValues(canonicalCsv: string, field: 'servicio' | 'profesional'): string[] {
  const { rows } = parseCsv(canonicalCsv);
  const set = new Set<string>();
  for (const row of rows) {
    const v = cell(row, field).trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

/** CSV de clientas derivado del de citas (mismo archivo, una fila por persona). */
export function clientsCsvFromAppointments(canonicalCsv: string): string {
  const { rows } = parseCsv(canonicalCsv);
  const seen = new Set<string>();
  const lines = ['nombre,telefono,email'];
  for (const row of rows) {
    const name = cell(row, 'nombre_clienta', 'nombre').trim();
    const phone = cell(row, 'telefono', 'phone').trim();
    const email = cell(row, 'email').trim();
    if (name.length < 2) continue;
    const key = `${phone || ''}|${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push([name, phone, email].map(csvEscape).join(','));
  }
  return lines.join('\n');
}

/** Servicios únicos con duración media del rango horario del archivo. */
export function servicesCsvFromAppointments(canonicalCsv: string): string {
  const { rows } = parseCsv(canonicalCsv);
  const byName = new Map<string, number[]>();
  for (const row of rows) {
    const name = cell(row, 'servicio').trim();
    if (name.length < 2) continue;
    const mins = Number(cell(row, 'minutos').replace(',', '.'));
    const list = byName.get(name) ?? [];
    if (Number.isFinite(mins) && mins >= 5) list.push(Math.round(mins));
    byName.set(name, list);
  }
  const lines = ['nombre,categoria,minutos,precio_euros'];
  for (const [name, durations] of [...byName.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    const avg = durations.length
      ? Math.round(durations.reduce((s, n) => s + n, 0) / durations.length)
      : 30;
    lines.push([csvEscape(name), 'corporal', String(Math.max(5, avg)), '0'].join(','));
  }
  return lines.join('\n');
}

export function listCsvHeaders(csv: string): string[] {
  return parseCsv(csv).headers;
}

export function columnMapReady(map: ColumnMap): string | null {
  const roles = new Set(Object.values(map));
  if (!roles.has('date')) return 'Indica qué columna es la fecha.';
  if (!roles.has('time') && !roles.has('duration')) return 'Indica la hora o la duración.';
  if (!roles.has('service')) return 'Indica qué columna es el servicio.';
  if (!roles.has('staff')) return 'Indica qué columna es la profesional.';
  if (!roles.has('client_name') && !(roles.has('client_first'))) {
    return 'Indica el nombre de la clienta.';
  }
  return null;
}
