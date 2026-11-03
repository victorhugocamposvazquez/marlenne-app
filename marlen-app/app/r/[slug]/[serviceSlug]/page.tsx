export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { renderBookingWizard } from '@/lib/booking/render';
import { resolveBookingServiceId } from '@/lib/booking/resolve';
import { loadBookingCatalog } from '@/lib/booking/server';
import { parseBookingPreset } from '@/lib/booking/urls';
import { BRAND_NAME } from '@/lib/brand';

type Props = {
  params: { slug: string; serviceSlug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const salonSlug = decodeURIComponent(params.slug).toLowerCase();
  const serviceSlug = decodeURIComponent(params.serviceSlug).toLowerCase();
  const cat = await loadBookingCatalog(salonSlug);
  const preset = parseBookingPreset(searchParams);
  if (!cat.ok) {
    return { title: `Reservar · ${BRAND_NAME}`, robots: { index: false } };
  }
  const serviceId = resolveBookingServiceId(cat.services, serviceSlug);
  const service = cat.services.find(s => s.id === serviceId);
  const headline = preset.title ?? service?.name ?? `Reservar en ${cat.salon.name}`;
  return {
    title: `${headline} · ${BRAND_NAME}`,
    description: cat.salon.intro ?? `Pide cita online en ${cat.salon.name}`,
  };
}

export default async function PublicServiceBookingPage({ params, searchParams }: Props) {
  const salonSlug = decodeURIComponent(params.slug).toLowerCase();
  const serviceSlug = decodeURIComponent(params.serviceSlug).toLowerCase();
  const cat = await loadBookingCatalog(salonSlug);
  return renderBookingWizard({
    salonSlug,
    catalog: cat,
    preset: parseBookingPreset(searchParams),
    pathServiceSlug: serviceSlug,
  });
}
