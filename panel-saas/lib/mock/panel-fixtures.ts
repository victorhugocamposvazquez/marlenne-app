/** Fixtures del handoff panel-saas v3 (sin BD). */

export const PLAN_CARDS = [
  {
    name: 'Básico' as const,
    price: 29,
    count: '277 empresas',
    mrr: '8.033 €/mes',
    features: ['1 profesional', '200 SMS/mes', 'Agenda y clientas', 'Soporte por correo'],
    featured: false,
  },
  {
    name: 'Pro' as const,
    price: 49,
    count: '549 empresas',
    mrr: '26.901 €/mes',
    features: ['Hasta 3 profesionales', '500 SMS/mes', 'Reserva online', 'Ficha clínica'],
    featured: true,
  },
  {
    name: 'Premium' as const,
    price: 89,
    count: '180 empresas',
    mrr: '16.020 €/mes',
    features: ['Profesionales ilimitados', '1.500 SMS/mes', 'WhatsApp Business', 'API y soporte prioritario'],
    featured: false,
  },
];

export const SMS_BONUSES = [
  { name: 'Bono 200 SMS', unit: '0,060 €/SMS', margin: '45 %', price: '12 €', sold: '412 vendidos' },
  { name: 'Bono 500 SMS', unit: '0,050 €/SMS', margin: '34 %', price: '25 €', sold: '1.038 vendidos' },
  { name: 'Bono 2.000 SMS', unit: '0,040 €/SMS', margin: '18 %', price: '80 €', sold: '96 vendidos' },
];

export const REFERRAL = {
  link: 'marlen.app/r/MARTA',
  referredDiscount: '−20 % durante 3 meses',
  referrerReward: '200 SMS + 10 €',
  programCost: '1.860 €/mes',
  origins: [
    { label: 'Auto-registro web', pct: 42 },
    { label: 'Referido', pct: 31 },
    { label: 'Alta manual', pct: 27 },
  ],
};

export const SMS_KPIS = [
  { label: 'Enviados este mes', value: '318.240', sub: '1.152 empresas · 0,033 €/SMS', color: '#0F0E1A' },
  { label: 'Entregados', value: '99,2 %', sub: '2.610 fallidos', color: '#22C55E' },
  { label: 'Coste proveedor', value: '10.502 €', sub: 'Ingreso por bonos: 4.190 €', color: '#0F0E1A' },
  { label: 'Sin cupo', value: '46', sub: 'empresas con envíos cortados', color: '#E11D48' },
];

export const SMS_FAILURES = [
  { reason: 'Número inválido', count: 892, pct: 34 },
  { reason: 'Tiempo de espera agotado', count: 741, pct: 28 },
  { reason: 'Operador rechazó', count: 522, pct: 20 },
  { reason: 'Sin cupo en empresa', count: 455, pct: 18 },
];

export const SMS_QUEUE = [
  { label: 'Latencia de entrega (p50 / p95)', value: '38 s / 41 s' },
  { label: 'Ritmo de salida', value: '410 SMS/min' },
  { label: 'Reintentos en curso', value: '312' },
  { label: 'Proveedor activo', value: 'Twilio (principal)' },
];

export const PAY_KPIS = [
  { label: 'Ingresos mensuales', value: '60.640 €', sub: 'cuotas + bonos', color: '#0F0E1A' },
  { label: 'Cobrado este mes', value: '61.240 €', sub: '312 cobros', color: '#22C55E' },
  { label: 'Fallido', value: '1.960 €', sub: '46 empresas', color: '#E11D48' },
  { label: 'Churn', value: '1,2 %', sub: '13 bajas / pausas', color: '#9A97A8' },
];

export const PAY_MOVEMENTS = [
  { when: 'Hoy', company: 'Piel & Luz Málaga', detail: 'Plan Pro · octubre', amount: '49 €', status: 'Pagado' as const },
  { when: 'Hoy', company: 'Centro Aura', detail: 'Bono 500 SMS', amount: '25 €', status: 'Pagado' as const },
  { when: 'Hoy', company: 'Studio Glow', detail: 'Plan Premium · octubre', amount: '89 €', status: 'Pagado' as const },
  { when: 'Ayer', company: 'Belleza Sur', detail: 'Plan Básico · septiembre', amount: '29 €', status: 'Fallido' as const },
  { when: 'Ayer', company: 'Clínica Dermis', detail: 'Plan Pro · referida −20 %', amount: '39,20 €', status: 'Pagado' as const },
  { when: '18 sep', company: 'Estética Lumen', detail: 'Plan Básico · septiembre', amount: '29 €', status: 'Reembolsado' as const },
];

export const DUNNING = [
  { day: '0', label: 'Cobro fallido · correo automático', value: '46' },
  { day: '3', label: 'Reintento 1 + SMS a la propietaria', value: '19 recuperados' },
  { day: '7', label: 'Reintento 2 + aviso en su app', value: '14 recuperados' },
  { day: '14', label: 'Se pausa la cuenta', value: '13 pausadas' },
];

export const EXPENSE_CATEGORIES: Record<string, string> = {
  Mensajería: '#d000a8',
  Infraestructura: '#0879ff',
  Pagos: '#8B5CF6',
  Software: '#22B8E8',
  Marketing: '#F59E0B',
  Otros: '#9A97A8',
};

export type ExpenseRow = {
  name: string;
  category: keyof typeof EXPENSE_CATEGORIES;
  type: 'Variable' | 'Fijo' | 'Anual';
  amount: number;
  prev: number;
  note: string;
};

export const EXPENSES: ExpenseRow[] = [
  { name: 'Twilio · SMS', category: 'Mensajería', type: 'Variable', amount: 10502, prev: 9980, note: '318.240 SMS · 0,033 €/SMS' },
  { name: 'Vonage · SMS respaldo', category: 'Mensajería', type: 'Variable', amount: 214, prev: 90, note: '6.100 SMS desviados' },
  { name: 'Meta · WhatsApp Business', category: 'Mensajería', type: 'Variable', amount: 1862, prev: 1710, note: '9.310 conversaciones/día' },
  { name: 'Stripe · comisiones', category: 'Pagos', type: 'Variable', amount: 980, prev: 945, note: '1,6 % sobre cobros' },
  { name: 'Hetzner · servidores y BD', category: 'Infraestructura', type: 'Fijo', amount: 640, prev: 640, note: '4 nodos + PostgreSQL' },
  { name: 'Cloudflare · CDN, WAF, DNS', category: 'Infraestructura', type: 'Fijo', amount: 220, prev: 220, note: 'Plan Business' },
  { name: 'Resend · correo transaccional', category: 'Mensajería', type: 'Variable', amount: 90, prev: 84, note: '124.000 correos/mes' },
  { name: 'Sentry · errores', category: 'Software', type: 'Fijo', amount: 89, prev: 89, note: 'Team · 100k eventos' },
  { name: 'Vercel · Pro', category: 'Software', type: 'Fijo', amount: 120, prev: 120, note: 'Web y auto-registro' },
  { name: 'Google Ads', category: 'Marketing', type: 'Variable', amount: 1500, prev: 1500, note: 'CAC 21 €' },
  { name: 'Programa de referidos', category: 'Marketing', type: 'Variable', amount: 1860, prev: 1620, note: 'Descuentos + premios' },
  { name: 'Gestoría y contabilidad', category: 'Otros', type: 'Fijo', amount: 180, prev: 180, note: 'Facturación e impuestos' },
];

export const FINANCE_INCOME = { fees: 56450, bonuses: 4190 };

export const FINANCE_HIST = [
  { month: 'oct', income: 31200, expense: 20900 },
  { month: 'nov', income: 33800, expense: 21600 },
  { month: 'dic', income: 36100, expense: 22800 },
  { month: 'ene', income: 38900, expense: 23400 },
  { month: 'feb', income: 41200, expense: 24100 },
  { month: 'mar', income: 43500, expense: 24900 },
  { month: 'abr', income: 45800, expense: 25600 },
  { month: 'may', income: 48100, expense: 26800 },
  { month: 'jun', income: 50300, expense: 27900 },
  { month: 'jul', income: 52400, expense: 28600 },
  { month: 'ago', income: 54600, expense: 29400 },
  { month: 'sep', income: 60640, expense: 0 },
];

export const SERVICES = [
  {
    name: 'Proveedor de SMS',
    provider: 'Twilio · respaldo Vonage',
    status: 'Degradado',
    color: '#F59E0B',
    metrics: [{ label: 'Entrega p95', value: '41 s', color: '#F59E0B' }, { label: 'Cola', value: '1.240' }, { label: 'Uptime 30 d', value: '99,4 %' }],
    note: 'Congestión en el operador desde las 8:50. Los envíos no se pierden, se retrasan.',
  },
  {
    name: 'Stripe',
    provider: 'Pagos y suscripciones',
    status: 'Operativo',
    color: '#22C55E',
    metrics: [{ label: 'Webhook', value: 'hace 2 min' }, { label: 'Cobros hoy', value: '312' }, { label: 'Uptime 30 d', value: '100 %' }],
    note: '',
  },
  {
    name: 'API / BD',
    provider: 'Supabase · Hetzner',
    status: 'Operativo',
    color: '#22C55E',
    metrics: [{ label: 'p95 API', value: '12 ms' }, { label: 'Conexiones', value: '84 %' }, { label: 'Uptime 30 d', value: '99,98 %' }],
    note: '',
  },
  {
    name: 'WhatsApp Business',
    provider: 'Meta Cloud API',
    status: 'Operativo',
    color: '#22C55E',
    metrics: [{ label: 'Conversaciones/día', value: '9.310' }, { label: 'Coste/día', value: '61 €' }, { label: 'Uptime 30 d', value: '99,9 %' }],
    note: '',
  },
  {
    name: 'Correo transaccional',
    provider: 'Resend',
    status: 'Operativo',
    color: '#22C55E',
    metrics: [{ label: 'Entrega', value: '99,7 %' }, { label: 'Este mes', value: '124k' }, { label: 'Uptime 30 d', value: '100 %' }],
    note: '',
  },
  {
    name: 'Copias de seguridad',
    provider: 'AWS S3',
    status: 'Operativo',
    color: '#22C55E',
    metrics: [{ label: 'Última copia', value: 'hace 4 h' }, { label: 'Retención', value: '30 d' }, { label: 'Tamaño', value: '2,1 GB/día' }],
    note: '',
  },
  {
    name: 'Colas SMS',
    provider: 'Upstash Redis',
    status: 'Degradado',
    color: '#F59E0B',
    metrics: [{ label: 'En cola', value: '234' }, { label: 'Reintentos', value: '312' }, { label: 'Uptime 30 d', value: '99,6 %' }],
    note: 'Latencia elevada en hora punta de recordatorios.',
  },
];

export const INCIDENTS = [
  { date: 'Hoy', color: '#F59E0B', title: 'Retraso en entrega de SMS', duration: 'en curso · 1 h 40', impact: 'Todas las empresas' },
  { date: '10 sep', color: '#E11D48', title: 'API caída por despliegue fallido', duration: '14 min', impact: 'Todas · revertido' },
  { date: '26 ago', color: '#F59E0B', title: 'Colas atrasadas (recordatorios 20 min tarde)', duration: '45 min', impact: '~300 empresas' },
];

export const TEAM = [
  { id: 1, name: 'Hugo Campos', email: 'hugo@marlen.app', last: 'ahora', role: 'Superadmin', avatar: '#0F0E1A', locked: true },
  { id: 2, name: 'Tere Anllo', email: 'tere@marlen.app', last: 'hace 20 min', role: 'Admin', avatar: '#4F6BF6', locked: false },
  { id: 3, name: 'Christian Ares', email: 'christian@marlen.app', last: 'ayer', role: 'Admin', avatar: '#F4487F', locked: false },
  { id: 4, name: 'Eva Ares', email: 'eva@marlen.app', last: 'hace 3 días', role: 'Admin', avatar: '#22B8E8', locked: false },
  { id: 5, name: 'Iria Ferreiro', email: 'iria@marlen.app', last: 'hace 1 h', role: 'Soporte', avatar: '#8B5CF6', locked: false },
];

export const PERMISSIONS = [
  { label: 'Ver empresas y fichas', su: true, admin: true, soporte: true, finanzas: true },
  { label: 'Entrar en modo soporte', su: true, admin: true, soporte: true, finanzas: false },
  { label: 'Añadir bonos / cambiar plan', su: true, admin: true, soporte: true, finanzas: false },
  { label: 'Cobros, reembolsos, facturas', su: true, admin: true, soporte: false, finanzas: true },
  { label: 'Editar precios y planes', su: true, admin: true, soporte: false, finanzas: false },
  { label: 'Ajustes globales y proveedores', su: true, admin: true, soporte: false, finanzas: false },
  { label: 'Claves de proveedores, borrar datos', su: true, admin: false, soporte: false, finanzas: false },
];

export const AUDIT_LOG = [
  { when: 'Hoy 9:40', who: 'Iria', company: 'Centro Aura', what: 'Añadió bono 500 SMS · corrigió remitente', duration: '6 min' },
  { when: 'Hoy 8:15', who: 'Iria', company: 'Belleza Sur', what: 'Solo lectura', duration: '2 min' },
  { when: 'Ayer', who: 'Tere', company: 'Estética Lumen', what: 'Reembolso 29 €', duration: '—' },
  { when: '18 sep', who: 'Hugo', company: 'Nórdica Wellness', what: 'Activó reserva online', duration: '4 min' },
];
