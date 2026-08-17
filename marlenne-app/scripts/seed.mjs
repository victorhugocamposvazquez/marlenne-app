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
  { full_name: 'Lucía Ferrer',    phone: '+34600111222', tags: ['VIP'] },
  { full_name: 'Nerea Campos',    phone: '+34600111223', tags: ['Piel sensible'] },
  { full_name: 'Alba Santamaría', phone: '+34600111224', tags: ['Fototipo IV'] },
  { full_name: 'Irene Bolaños',   phone: '+34600111225', tags: [] },
  { full_name: 'Paula Nieto',     phone: '+34600111226', tags: ['VIP', 'Fototipo III'] },
  { full_name: 'Rocío Vidal',     phone: '+34600111227', tags: [] },
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
  } else {
    // Realinea la contraseña si el script se ejecuta con otra DEMO_PASSWORD.
    fail(`updateUser ${m.email}`, (await sb.auth.admin.updateUserById(user.id, { password: PASSWORD })).error);
  }

  const { error } = await sb.from('staff').upsert({
    id: user.id, salon_id: salonId, full_name: m.full_name, role: m.role,
    job_title: m.job_title, color: m.color, sort_order: m.sort_order, is_active: true,
  });
  fail(`staff ${m.email}`, error);
  return user.id;
}

/** Hoy a HH:MM en Europe/Madrid, expresado en UTC. */
function todayAt(hhmm) {
  const [h, min] = hhmm.split(':').map(Number);
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  const naive = new Date(`${today}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`);
  // Desfase de Madrid respecto a UTC ese día (+1 o +2 según horario de verano).
  const offsetMin =
    (new Date(naive.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })).getTime() -
     new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()) / 60000;
  return new Date(naive.getTime() - offsetMin * 60000).toISOString();
}

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
  if (existing) { clientIds.push(existing.id); continue; }
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

console.log('\nListo. Contraseña de todos los perfiles: DEMO_PASSWORD de .env.local');
