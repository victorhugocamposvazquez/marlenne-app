/** Catálogo real del centro → tipos del estudio Marketing. */

import { bookingPageUrl } from '@/lib/booking/urls';
import type { CatalogItem, CreativeType } from '@/lib/marketing/types';
import type { PackTemplate, Provider, ServiceOption } from '@/lib/types';

function eur(cents: number): string {
  const n = cents / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

function themeForServiceName(name: string): string {
  const n = name.toLowerCase();
  if (/uña|manic|pedic|nail/.test(n)) return 'unas';
  if (/ceja|pestañ|lifting|laminado/.test(n)) return 'pestanas';
  if (/láser|laser|depil/.test(n)) return 'depilacion';
  if (/presoterap|corporal|cavit|radiof|reduct/.test(n)) return 'corporal';
  if (/masaje|spa|relax/.test(n)) return 'spa';
  if (/facial|limpieza|peeling|hialuron|botox|skin/.test(n)) return 'facial';
  return 'centro';
}

export function buildMarketingCatalog(input: {
  salonName: string;
  bookingSlug: string | null;
  origin: string;
  packs: PackTemplate[];
  services: ServiceOption[];
  staff: Provider[];
}): CreativeType[] {
  const salon = input.salonName || 'Tu centro';
  const linkMeta = input.bookingSlug
    ? bookingPageUrl(input.origin, input.bookingSlug).replace(/^https?:\/\//, '')
    : 'Activa el widget de reservas';

  const packItems: CatalogItem[] = input.packs.map(p => ({
    label: p.name,
    meta: `${p.sessions_total} sesiones${p.service_name ? ` · ${p.service_name}` : ''}`,
    price: eur(p.price_cents),
    title: p.name,
    subtitle: `${p.sessions_total} sesiones${p.service_name ? ` · ${p.service_name}` : ''}`,
    theme: themeForServiceName(p.service_name || p.name),
    templateId: p.id,
    serviceId: p.service_id,
    sessionsTotal: p.sessions_total,
    priceCents: p.price_cents,
    vars: {
      name: (p.service_name || p.name).toLowerCase(),
      sessions: p.sessions_total,
      salon,
    },
  }));

  const serviceItems: CatalogItem[] = input.services.map(s => ({
    label: s.name,
    meta: `${s.duration_min} min`,
    price: eur(s.price_cents),
    title: s.name,
    subtitle: `${s.duration_min} min`,
    theme: themeForServiceName(s.name),
    serviceId: s.id,
    priceCents: s.price_cents,
    vars: { name: s.name.toLowerCase(), minutes: s.duration_min, salon },
  }));

  const staffItems: CatalogItem[] = input.staff.map(st => ({
    label: st.full_name,
    meta: st.job_title || 'Profesional',
    price: '',
    title: `Conoce a ${st.full_name.split(' ')[0] || st.full_name}`,
    subtitle: st.job_title || 'Profesional del centro',
    cta: `Reserva con ${st.full_name.split(' ')[0] || st.full_name}`,
    theme: 'equipo',
    vars: {
      name: st.full_name.split(' ')[0] || st.full_name,
      job: (st.job_title || 'profesional').toLowerCase(),
      salon,
    },
  }));

  const giftItems: CatalogItem[] = [
    ...(packItems.slice(0, 4).map(p => ({
      ...p,
      title: `Regala ${p.title}`,
      subtitle: p.subtitle,
      cta: 'Regalar',
      vars: { ...p.vars, name: `un ${String(p.vars.name || 'bono')}` },
    }))),
    ...(serviceItems.slice(0, 2).map(s => ({
      ...s,
      title: `Regala ${s.title}`,
      cta: 'Regalar',
      vars: { ...s.vars, name: `un ${String(s.vars.name || 'tratamiento')}` },
    }))),
  ];

  const huecoItems: CatalogItem[] =
    serviceItems.length > 0
      ? serviceItems.slice(0, 6).map(s => ({
          ...s,
          label: `Hueco · ${s.label}`,
          title: s.title,
          subtitle: 'Hoy o mañana · reserva ya',
          eyebrow: 'Última hora',
          cta: 'Lo quiero',
          vars: { ...s.vars, day: 'hoy' },
        }))
      : [
          {
            label: 'Hueco libre',
            meta: 'Añade servicios al catálogo',
            price: '',
            title: 'Hay un hueco libre',
            subtitle: 'Reserva online en un minuto',
            theme: 'centro',
            vars: { salon },
          },
        ];

  return [
    {
      id: 'bono',
      label: 'Bono',
      desc: 'Pack de sesiones con precio',
      note:
        packItems.length > 0
          ? `${packItems.length} bono${packItems.length === 1 ? '' : 's'} en tu catálogo`
          : 'Aún no hay plantillas de bono',
      question: '¿Qué bono quieres anunciar?',
      style: 'luxe',
      eyebrow: salon,
      cta: 'Comprar bono',
      icon: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14.5 7v10',
      items:
        packItems.length > 0
          ? packItems
          : [
              {
                label: 'Bono de sesiones',
                meta: 'Crea plantillas en Ajustes → Bonos',
                price: '',
                title: 'Bono de sesiones',
                subtitle: 'Personaliza el texto a tu gusto',
                theme: 'corporal',
                vars: { name: 'bono', sessions: 5, salon },
              },
            ],
    },
    {
      id: 'servicio',
      label: 'Servicio',
      desc: 'Un tratamiento del catálogo',
      note:
        serviceItems.length > 0
          ? `${serviceItems.length} servicio${serviceItems.length === 1 ? '' : 's'} en tu catálogo`
          : 'Aún no hay servicios',
      question: '¿Qué servicio quieres anunciar?',
      style: 'soft',
      eyebrow: salon,
      cta: 'Reservar cita',
      icon: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
      items:
        serviceItems.length > 0
          ? serviceItems
          : [
              {
                label: 'Tratamiento',
                meta: 'Añade servicios en Ajustes',
                price: '',
                title: 'Tu tratamiento',
                subtitle: 'Personaliza el texto',
                theme: 'facial',
                vars: { name: 'tratamiento', minutes: 60, salon },
              },
            ],
    },
    {
      id: 'reserva',
      label: 'Reserva',
      desc: 'Invita a pedir cita online',
      note: 'Con tu enlace de reserva',
      style: 'card',
      eyebrow: salon,
      cta: 'Reservar ahora',
      icon: 'M6 5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM3 10h18M8 3v4M16 3v4',
      items: [
        {
          label: 'Enlace de reserva online',
          meta: linkMeta,
          price: '',
          title: 'Reserva online',
          subtitle: 'Elige día, hora y profesional',
          theme: 'centro',
          vars: { salon },
        },
      ],
    },
    {
      id: 'ultima',
      bank: 'hueco',
      label: 'Última hora',
      desc: 'Llena un hueco libre de la agenda',
      note: `${huecoItems.length} opción${huecoItems.length === 1 ? '' : 'es'} para anunciar`,
      question: '¿Qué hueco quieres llenar?',
      style: 'promo',
      eyebrow: 'Última hora',
      cta: 'Lo quiero',
      icon: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2',
      items: huecoItems,
    },
    {
      id: 'equipo',
      label: 'Equipo',
      desc: 'Presenta a una profesional',
      note:
        staffItems.length > 0
          ? `${staffItems.length} profesional${staffItems.length === 1 ? '' : 'es'}`
          : 'Añade equipo en Ajustes',
      question: '¿A quién quieres presentar?',
      style: 'editorial',
      eyebrow: 'Nuestro equipo',
      cta: 'Reservar cita',
      icon: 'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6',
      items:
        staffItems.length > 0
          ? staffItems
          : [
              {
                label: 'Nuestro equipo',
                meta: salon,
                price: '',
                title: 'Nuestro equipo',
                subtitle: 'Profesionales que te cuidan',
                theme: 'equipo',
                vars: { name: 'nuestro equipo', job: 'equipo', salon },
              },
            ],
    },
    {
      id: 'regalo',
      label: 'Regalo',
      desc: 'Tarjeta o bono para regalar',
      note:
        giftItems.length > 0
          ? `${giftItems.length} opción${giftItems.length === 1 ? '' : 'es'} para regalar`
          : 'Usa bonos o servicios del catálogo',
      question: '¿Qué quieres que regalen?',
      style: 'minimal',
      eyebrow: 'Tarjeta regalo',
      cta: 'Regalar',
      icon: 'M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8C10 4 6 4 6 6.5S9 8 12 8zM12 8c2-4 6-4 6-1.5S15 8 12 8z',
      items:
        giftItems.length > 0
          ? giftItems
          : [
              {
                label: 'Tarjeta regalo',
                meta: 'Para cualquier tratamiento',
                price: 'Desde 30 €',
                title: 'Regala un rato de calma',
                subtitle: 'Para cualquier tratamiento del centro',
                theme: 'temporada',
                vars: { name: 'una tarjeta regalo', salon },
              },
            ],
    },
  ];
}
