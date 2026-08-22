/**
 * Siembra el equipo y unos datos de demo.
 *
 *   node scripts/seed.mjs
 *
 * Necesita NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las lee de
 * .env.local). Es idempotente: se puede volver a ejecutar sin duplicar nada.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const PASSWORD = process.env.DEMO_PASSWORD;
if (!PASSWORD) throw new Error('Falta DEMO_PASSWORD en .env.local');

const TEAM = [
  { email: 'direccion@marlenne.test',  full_name: 'Marlenne Ruiz',  role: 'admin',     job_title: 'Dirección del centro',              color: '#8B5CF6', sort_order: 0 },
  { email: 'recepcion@marlenne.test',  full_name: 'Carmen Ibáñez',  role: 'reception', job_title: 'Recepción y atención al cliente',   color: '#A855F7', sort_order: 1 },
  { email: 'valeria@marlenne.test',    full_name: 'Valeria Ortiz',  role: 'provider',  job_title: 'Esteticista senior · corporal',     color: '#8B5CF6', sort_order: 2 },
  { email: 'marco@marlenne.test',      full_name: 'Marco Díaz',     role: 'provider',  job_title: 'Técnico láser · aparatología',      color: '#6366F1', sort_order: 3 },
  { email: 'sofia@marlenne.test',      full_name: 'Sofía Márquez',  role: 'provider',  job_title: 'Facialista · micropigmentación',    color: '#EC4899', sort_order: 4 },
  { email: 'ainhoa@marlenne.test',     full_name: 'Ainhoa Rey',     role: 'provider',  job_title: 'Esteticista · corporal y facial',   color: '#0EA5E9', sort_order: 5 },
];

const CLIENTS = [
  { full_name: 'Lucía Ferrer',    phone: '+34600111222', email: 'lucia@demo.test',  birth_date: '1988-03-12', tags: ['VIP'], notes: 'Prefiere cabina 2. No frío extremo.' },
  { full_name: 'Nerea Campos',    phone: '+34600111223', email: 'nerea@demo.test',  birth_date: '1994-07-02', tags: ['Piel sensible'], notes: null },
  { full_name: 'Alba Santamaría', phone: '+34600111224', email: 'alba@demo.test',   birth_date: '1991-11-19', tags: ['Fototipo IV'], notes: 'Láser: fluencia conservadora.' },
  { full_name: 'Irene Bolaños',   phone: '+34600111225', email: null,               birth_date: '1985-01-30', tags: [], notes: null },
  { full_name: 'Paula Nieto',     phone: '+34600111226', email: 'paula@demo.test',  birth_date: '1996-05-08', tags: ['VIP', 'Fototipo III'], notes: 'Agenda solo tardes.' },
  { full_name: 'Rocío Vidal',     phone: '+34600111227', email: null,               birth_date: '1979-09-21', tags: [], notes: 'Primera visita el mes pasado.' },
];

/** Citas de hoy: [índice de profesional, índice de clienta, nombre de servicio, hora local]. */
const TODAY = [
  [0, 0, 'Criolipólisis',            '10:00'],
  [0, 3, 'Radiofrecuencia',          '12:30'],
  [1, 1, 'D. Láser - 30 min',        '10:30'],
  [1, 4, 'D. Láser - 1 hora',        '16:00'],
  [2, 2, 'Facial radiance lifting',  '11:00'],
  [2, 5, 'Microblading - 90 min',    '17:00'],
  [3, 4, 'Presoterapia',             '09:30'],
];

const fail = (label, error) => { if (error) throw new Error(`${label}: ${error.message}`); };

async function findUserByEmail(email) {
  // listUsers pagina; el equipo es pequeño, con la primera página sobra.
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 200 });
  fail('listUsers', error);
  return data.users.find(u => u.email === email);
}

async function upsertMember(salonId, m) {
  let user = await findUserByEmail(m.email);
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email: m.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: m.full_name },
    });
    fail(`createUser ${m.email}`, error);
    user = data.user;
    console.log(`  + usuario ${m.email}`);
  } else if (process.env.SEED_RESET_PASSWORDS === '1') {
    fail(`updateUser ${m.email}`, (await sb.auth.admin.updateUserById(user.id, { password: PASSWORD })).error);
    console.log(`  ~ contraseña de ${m.email} realineada`);
  } else {
    console.log(`  = usuario ${m.email} (contraseña intacta)`);
  }

  const { error } = await sb.from('staff').upsert({
    id: user.id, salon_id: salonId, full_name: m.full_name, role: m.role,
    job_title: m.job_title, color: m.color, sort_order: m.sort_order, is_active: true,
  });
  fail(`staff ${m.email}`, error);
  return user.id;
}

/** Un día (YYYY-MM-DD) a HH:MM en Europe/Madrid, expresado en UTC. */
function atMadrid(day, hhmm) {
  const [h, min] = hhmm.split(':').map(Number);
  const naive = new Date(`${day}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`);
  const offsetMin =
    (new Date(naive.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })).getTime() -
     new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()) / 60000;
  return new Date(naive.getTime() - offsetMin * 60000).toISOString();
}

const madridDay = (offset = 0) => {
  const [y, m, d] = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
};

const todayAt = hhmm => atMadrid(madridDay(0), hhmm);
const daysAgoAt = (n, hhmm) => atMadrid(madridDay(-n), hhmm);
const daysAgo = n => madridDay(-n);

const { data: salon, error: salonErr } = await sb
  .from('salons').select('id, name').eq('name', 'Marlenne').single();
fail('salón Marlenne (¿aplicaste las migraciones?)', salonErr);
console.log(`Centro: ${salon.name} (${salon.id})`);

console.log('Equipo:');
const staffIds = [];
for (const m of TEAM) staffIds.push(await upsertMember(salon.id, m));
const providerIds = staffIds.slice(2);

console.log('Clientas:');
const clientIds = [];
for (const c of CLIENTS) {
  const { data: existing } = await sb.from('clients')
    .select('id').eq('salon_id', salon.id).eq('full_name', c.full_name).maybeSingle();
  if (existing) {
    await sb.from('clients').update({
      phone: c.phone, email: c.email, birth_date: c.birth_date, tags: c.tags, notes: c.notes,
    }).eq('id', existing.id);
    clientIds.push(existing.id);
    continue;
  }
  const { data, error } = await sb.from('clients')
    .insert({ ...c, salon_id: salon.id }).select('id').single();
  fail(`cliente ${c.full_name}`, error);
  clientIds.push(data.id);
  console.log(`  + ${c.full_name}`);
}

const { data: services, error: svcErr } = await sb
  .from('services').select('id, name, duration_min, price_cents').eq('salon_id', salon.id);
fail('services', svcErr);
const byName = new Map(services.map(s => [s.name, s]));

console.log('Citas de hoy:');
for (const [pi, ci, serviceName, hhmm] of TODAY) {
  const svc = byName.get(serviceName);
  if (!svc) { console.warn(`  ! servicio no encontrado: ${serviceName}`); continue; }

  const starts_at = todayAt(hhmm);
  const { data: dup } = await sb.from('appointments')
    .select('id').eq('provider_id', providerIds[pi]).eq('starts_at', starts_at).maybeSingle();
  if (dup) continue;

  const { error } = await sb.from('appointments').insert({
    salon_id: salon.id,
    client_id: clientIds[ci],
    service_id: svc.id,
    provider_id: providerIds[pi],
    starts_at,
    duration_min: svc.duration_min,
    price_cents: svc.price_cents,
    status: 'prog',
  });
  if (error) { console.warn(`  ! ${hhmm} ${serviceName}: ${error.message}`); continue; }
  console.log(`  + ${hhmm} ${serviceName}`);
}

// Una en cabina para que Hoy no quede vacío a media mañana.
const { data: live } = await sb.from('appointments')
  .select('id').eq('provider_id', providerIds[0]).eq('starts_at', todayAt('10:00')).maybeSingle();
if (live) await sb.from('appointments').update({ status: 'curso' }).eq('id', live.id);

console.log('Tratamientos y medidas:');
const txSeeds = [
  {
    ci: 0, pi: 0, service: 'Criolipólisis', zone: 'Abdomen + flancos',
    sessions_done: 3, sessions_total: 6, opened: 40,
    last_params: { 'TEMP.': '-8 °C', TIEMPO: '60 min', CABEZAL: 'CoolMini', 'VACÍO': 'medio' },
    note: 'Bien tolerado. Próxima sesión no antes de 6 semanas.',
    measures: [
      { days: 40, metric: 'CINTURA', value: 78, unit: 'cm', session: 0, baseline: true },
      { days: 26, metric: 'CINTURA', value: 76.5, unit: 'cm', session: 1 },
      { days: 12, metric: 'CINTURA', value: 75, unit: 'cm', session: 2 },
      { days: 40, metric: 'CADERA', value: 102, unit: 'cm', session: 0, baseline: true },
      { days: 12, metric: 'CADERA', value: 100, unit: 'cm', session: 2 },
    ],
  },
  {
    ci: 2, pi: 1, service: 'D. Láser - 30 min', zone: 'Axilas',
    sessions_done: 4, sessions_total: 8, opened: 70,
    last_params: { FLUENCIA: '12 J/cm²', PULSO: '30 ms', 'FRÍO': '5', FOTOTIPO: 'IV' },
    note: null,
    measures: [
      { days: 70, metric: 'DENSIDAD', text: 'Alta', session: 0, baseline: true },
      { days: 20, metric: 'DENSIDAD', text: 'Media', session: 3 },
    ],
  },
  {
    ci: 4, pi: 1, service: 'D. Láser - 1 hora', zone: 'Piernas enteras',
    sessions_done: 2, sessions_total: 8, opened: 35,
    last_params: { FLUENCIA: '14 J/cm²', PULSO: '20 ms', 'FRÍO': '6', FOTOTIPO: 'III' },
    note: 'Pide cita solo a partir de las 16:00.',
    measures: [],
  },
];

const treatmentIds = [];
for (const t of txSeeds) {
  const svc = byName.get(t.service);
  if (!svc) continue;
  const { data: existing } = await sb.from('treatments')
    .select('id').eq('client_id', clientIds[t.ci]).eq('service_id', svc.id).maybeSingle();
  let tid = existing?.id;
  if (!tid) {
    const { data, error } = await sb.from('treatments').insert({
      salon_id: salon.id,
      client_id: clientIds[t.ci],
      service_id: svc.id,
      provider_id: providerIds[t.pi],
      zone: t.zone,
      sessions_done: t.sessions_done,
      sessions_total: t.sessions_total,
      last_params: t.last_params,
      note: t.note,
      opened_at: daysAgo(t.opened),
    }).select('id').single();
    fail(`tratamiento ${t.service}`, error);
    tid = data.id;
    console.log(`  + ${CLIENTS[t.ci].full_name} · ${t.service}`);
  }
  treatmentIds.push(tid);

  for (const m of t.measures) {
    const { data: dup } = await sb.from('measurements')
      .select('id').eq('treatment_id', tid).eq('metric', m.metric).eq('session_no', m.session ?? 0).maybeSingle();
    if (dup) continue;
    fail(`medida ${m.metric}`, (await sb.from('measurements').insert({
      treatment_id: tid,
      session_no: m.session ?? null,
      metric: m.metric,
      value_num: m.value ?? null,
      value_text: m.text ?? null,
      unit: m.unit ?? null,
      is_baseline: !!m.baseline,
      measured_at: daysAgoAt(m.days, '11:00'),
    })).error);
  }
}

console.log('Historial:');
const PAST = [
  [0, 0, 'Criolipólisis', 40, '11:00', 0],
  [0, 0, 'Criolipólisis', 26, '11:00', 0],
  [0, 0, 'Criolipólisis', 12, '11:00', 0],
  [1, 2, 'D. Láser - 30 min', 20, '10:30', 1],
  [1, 4, 'D. Láser - 1 hora', 14, '16:00', 2],
];
for (const [pi, ci, serviceName, ago, hhmm, ti] of PAST) {
  const svc = byName.get(serviceName);
  if (!svc) continue;
  const starts_at = daysAgoAt(ago, hhmm);
  const { data: dup } = await sb.from('appointments')
    .select('id').eq('provider_id', providerIds[pi]).eq('starts_at', starts_at).maybeSingle();
  if (dup) continue;
  const { error } = await sb.from('appointments').insert({
    salon_id: salon.id,
    client_id: clientIds[ci],
    service_id: svc.id,
    provider_id: providerIds[pi],
    treatment_id: treatmentIds[ti] ?? null,
    starts_at,
    duration_min: svc.duration_min,
    price_cents: svc.price_cents,
    status: 'done',
  });
  if (error) { console.warn(`  ! ${serviceName}: ${error.message}`); continue; }
  console.log(`  + hace ${ago}d ${serviceName}`);
}

console.log('Consentimientos y espera:');
for (const [ci, kind] of [[0, 'fotografia'], [0, 'tratamiento'], [4, 'fotografia'], [2, 'datos_salud']]) {
  const { data: dup } = await sb.from('consents')
    .select('id').eq('client_id', clientIds[ci]).eq('kind', kind).maybeSingle();
  if (dup) continue;
  fail(`consent ${kind}`, (await sb.from('consents').insert({
    client_id: clientIds[ci], kind, taken_by: staffIds[0],
  })).error);
}

const WAIT = [
  [1, 'Facial radiance lifting', 'Esta semana, por la tarde'],
  [3, 'Valoración gratuita criolipólisis', 'Cualquier mañana'],
  [null, 'HIFU - 1 hora', 'Nombre en espera: Marta Soler · si libera Sofía'],
];
for (const [ci, serviceName, preference] of WAIT) {
  const svc = byName.get(serviceName);
  const { data: dup } = await sb.from('waitlist')
    .select('id').eq('salon_id', salon.id).is('resolved_at', null)
    .eq(ci === null ? 'client_name' : 'client_id', ci === null ? 'Marta Soler' : clientIds[ci])
    .maybeSingle();
  if (dup) continue;
  fail('waitlist', (await sb.from('waitlist').insert({
    salon_id: salon.id,
    client_id: ci === null ? null : clientIds[ci],
    client_name: ci === null ? 'Marta Soler' : null,
    service_id: svc?.id ?? null,
    preference,
  })).error);
  console.log(`  + espera ${ci === null ? 'Marta Soler' : CLIENTS[ci].full_name}`);
}

const lunchStart = todayAt('14:00');
const { data: lunch } = await sb.from('time_blocks')
  .select('id').eq('provider_id', providerIds[0]).eq('starts_at', lunchStart).maybeSingle();
if (!lunch) {
  fail('bloqueo comida', (await sb.from('time_blocks').insert({
    salon_id: salon.id, provider_id: providerIds[0],
    reason: 'comida', label: 'Comida', starts_at: lunchStart, duration_min: 60,
  })).error);
}

console.log('\nListo. Los usuarios nuevos usan DEMO_PASSWORD; los que ya existían no se tocan.');
console.log('Para realinearlas: SEED_RESET_PASSWORDS=1 npm run seed');
