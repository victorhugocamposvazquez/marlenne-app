import { eur } from '@/lib/format';
import type { Company, CompanyPlan } from '@/lib/types';

const CITIES = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada', 'A Coruña', 'Vitoria', 'Elche', 'Oviedo', 'Santander', 'Pamplona', 'Almería', 'Donostia', 'Burgos', 'Salamanca', 'Logroño', 'Badajoz', 'Huelva', 'Lleida', 'Tarragona', 'Cádiz', 'Jaén', 'Girona', 'Toledo', 'Cáceres'];
const A = ['Estética', 'Centro', 'Clínica', 'Espacio', 'Studio', 'Belleza', 'Instituto', 'Salón'];
const B = ['Aura', 'Lumen', 'Piel & Luz', 'Nórdica', 'Marlén', 'Sur', 'Serena', 'Vital', 'Glow', 'Pura', 'Dermis', 'Luz', 'Blanca', 'Kalma', 'Ámbar', 'Índigo', 'Mar', 'Alba', 'Gaia', 'Ónix', 'Lys', 'Nácar', 'Coral', 'Brisa', 'Rosa', 'Bloom', 'Eterna', 'Nova', 'Cielo', 'Verde', 'Zen', 'Mía', 'Ella', 'Bella', 'Vera', 'Iris', 'Luna', 'Sol', 'Éter', 'Flor'];
const FIRST = ['Marta', 'Lucía', 'Paula', 'Nerea', 'Alba', 'Rocío', 'Irene', 'Carla', 'Sara', 'Elena', 'Ana', 'Laura', 'Eva', 'Noa', 'Julia', 'Claudia', 'Inés', 'Marina', 'Sofía', 'Andrea'];
const LAST = ['García', 'Ruiz', 'Benito', 'Vidal', 'Bolaños', 'Nieto', 'Campos', 'Ferrer', 'Santamaría', 'Torres', 'Mota', 'Salas', 'Ortega', 'Navarro', 'Serrano', 'Molina', 'Castro', 'Iglesias', 'Romero', 'Gil'];
const PLANS: Record<CompanyPlan, number> = { Básico: 29, Pro: 49, Premium: 89 };
const SMS: Record<CompanyPlan, number> = { Básico: 200, Pro: 500, Premium: 1500 };
const COLORS = ['#8B5CF6', '#F4487F', '#22B8E8', '#4F6BF6', '#22C55E', '#F59E0B', '#C060F5', '#0EA5E9'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

function generateCompanies(): Company[] {
  const out: Company[] = [];
  const used = new Set<string>();
  for (let i = 1; i <= 1152; i++) {
    let name = '';
    let tries = 0;
    do {
      name = `${pick(A)} ${pick(B)}`;
      if (used.has(name)) name += ` ${pick(CITIES).split(' ')[0]}`;
      tries += 1;
    } while (used.has(name) && tries < 5);
    if (used.has(name)) name = `${name} ${i}`;
    used.add(name);

    const r = rnd();
    const plan: CompanyPlan = r < 0.27 ? 'Básico' : r < 0.82 ? 'Pro' : 'Premium';
    const s = rnd();
    const status = s < 0.87 ? 'Activa' : s < 0.92 ? 'Prueba' : s < 0.96 ? 'Impago' : 'Pausada';
    const smsTotal = status === 'Prueba' ? 50 : SMS[plan];
    const u = rnd();
    const smsLeft = status === 'Impago'
      ? 0
      : Math.round(smsTotal * (u < 0.06 ? rnd() * 0.12 : u < 0.2 ? 0.12 + rnd() * 0.25 : 0.35 + rnd() * 0.65));
    const pros = plan === 'Básico' ? 1 : plan === 'Pro' ? 1 + Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 6);
    const sinceY = 2023 + Math.floor(rnd() * 3);
    const sinceM = Math.floor(rnd() * 12);
    const nextDay = 1 + Math.floor(rnd() * 28);
    const contact = `${pick(FIRST)} ${pick(LAST)}`;
    const slug = name.toLowerCase().replace(/[^a-z]/g, '');
    out.push({
      id: i,
      name,
      city: pick(CITIES),
      plan,
      price: PLANS[plan],
      status,
      smsTotal,
      smsLeft,
      pros,
      since: `${MONTHS[sinceM]} ${sinceY}`,
      next: status === 'Impago'
        ? `vencido ${nextDay} sep`
        : status === 'Prueba'
          ? `termina ${nextDay} oct`
          : status === 'Pausada'
            ? '—'
            : `${nextDay} oct`,
      contact,
      email: `${contact.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@${slug}.es`,
      phone: `6${String(Math.floor(rnd() * 1e8)).padStart(8, '0').replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4')}`,
      stripe: `cus_${Math.random().toString(36).slice(2, 8)}`,
      avatar: COLORS[i % COLORS.length],
      mrr: status === 'Activa' || status === 'Impago' ? PLANS[plan] : 0,
    });
  }

  let mrr = out.reduce((a, c) => a + (c.status === 'Activa' ? c.price : 0), 0);
  for (let i = 0; i < out.length && mrr !== 56450; i++) {
    const c = out[i];
    if (c.status !== 'Activa') continue;
    const diff = 56450 - mrr;
    if (diff >= 40 && c.plan === 'Básico') { c.plan = 'Premium'; c.price = 89; c.smsTotal = 1500; c.smsLeft = Math.min(c.smsLeft * 7, 1500); mrr += 60; }
    else if (diff >= 20 && c.plan === 'Básico') { c.plan = 'Pro'; c.price = 49; c.smsTotal = 500; c.smsLeft = Math.min(c.smsLeft * 2, 500); mrr += 20; }
    else if (diff >= 40 && c.plan === 'Pro') { c.plan = 'Premium'; c.price = 89; c.smsTotal = 1500; c.smsLeft = Math.min(c.smsLeft * 3, 1500); mrr += 40; }
    else if (diff < 0 && diff <= -60 && c.plan === 'Premium') { c.plan = 'Básico'; c.price = 29; c.smsTotal = 200; c.smsLeft = Math.min(c.smsLeft, 200); mrr -= 60; }
    else if (diff < 0 && diff <= -40 && c.plan === 'Premium') { c.plan = 'Pro'; c.price = 49; c.smsTotal = 500; c.smsLeft = Math.min(c.smsLeft, 500); mrr -= 40; }
    else if (diff < 0 && diff <= -20 && c.plan === 'Pro') { c.plan = 'Básico'; c.price = 29; c.smsTotal = 200; c.smsLeft = Math.min(c.smsLeft, 200); mrr -= 20; }
  }

  let m = out.reduce((a, c) => a + (c.status === 'Activa' ? c.price : 0), 0);
  for (const c of out) {
    if (m === 56450) break;
    const diff = 56450 - m;
    if (diff < 0 && c.status === 'Activa' && c.price <= -diff) { c.status = 'Pausada'; c.next = '—'; m -= c.price; }
    else if (diff > 0 && c.status === 'Pausada' && c.price <= diff) { c.status = 'Activa'; c.next = '14 oct'; m += c.price; }
  }
  if (m !== 56450) {
    const c = out.find(x => x.status === 'Activa');
    if (c) c.price += 56450 - m;
  }
  return out;
}

export const LIVE_COMPANY_ID = 90001;

const ARLETT: Company = {
  id: LIVE_COMPANY_ID,
  name: 'Arlett Beauty',
  city: 'Producción',
  plan: 'Pro',
  price: 0,
  status: 'Activa',
  smsTotal: 0,
  smsLeft: 0,
  pros: 0,
  since: 'sep 2026',
  next: '—',
  contact: '—',
  email: '—',
  phone: '—',
  stripe: '—',
  avatar: '#F4487F',
  mrr: 0,
  live: true,
};

export const COMPANIES = [ARLETT, ...generateCompanies()];
export const MRR = COMPANIES.reduce((a, c) => a + (c.status === 'Activa' ? c.price : 0), 0);

export function getCompany(id: number) {
  return COMPANIES.find(c => c.id === id) ?? null;
}

export function attentionItems() {
  const impago = COMPANIES.filter(c => c.status === 'Impago').slice(0, 3);
  const lowSms = COMPANIES.filter(c => c.status === 'Activa' && c.smsLeft / c.smsTotal < 0.15).slice(0, 2);
  const trial = COMPANIES.filter(c => c.status === 'Prueba').slice(0, 2);
  return [
    ...impago.map(c => ({ title: c.name, sub: `Impago · ${eur(c.price)}/mes en juego`, action: 'Ver ficha', color: '#E11D48', id: c.id })),
    ...lowSms.map(c => ({ title: c.name, sub: `SMS al ${Math.round((c.smsLeft / c.smsTotal) * 100)} %`, action: 'Añadir bono', color: '#F59E0B', id: c.id })),
    ...trial.map(c => ({ title: c.name, sub: 'Prueba termina pronto', action: 'Ver ficha', color: '#0879ff', id: c.id })),
  ].slice(0, 5);
}
