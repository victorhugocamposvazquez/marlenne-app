'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import CreativeLibrary from '@/components/marketing/CreativeLibrary';
import CreativeWizard from '@/components/marketing/CreativeWizard';
import type { MarketingBrand, MarketingCreativeRow } from '@/lib/marketing/types';
import type { PackTemplate, Provider, ServiceOption } from '@/lib/types';

export default function MarketingHub({
  salonId,
  brand,
  creatives,
  packs,
  services,
  staff,
}: {
  salonId: string;
  brand: MarketingBrand;
  creatives: MarketingCreativeRow[];
  packs: PackTemplate[];
  services: ServiceOption[];
  staff: Provider[];
}) {
  const [mode, setMode] = useState<'library' | 'wizard'>('library');

  if (mode === 'wizard') {
    return (
      <CreativeWizard
        salonId={salonId}
        brand={brand}
        packs={packs}
        services={services}
        staff={staff}
        onCancel={() => setMode('library')}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body text-ink-2">
            Stories y posts con la marca del centro. Elige estilo, bono o servicio, y descarga el PNG listo para Instagram.
          </p>
          {!brand.bookingSlug && (
            <p className="mt-2 text-caption text-ink-3">
              Tip: activa el widget de reservas para que el enlace del botón lleve directo a pedir cita.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMode('wizard')}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill bg-ink px-3.5 text-caption font-semibold text-white"
        >
          <Plus size={16} strokeWidth={2.4} aria-hidden />
          Nueva
        </button>
      </div>

      <section>
        <h2 className="mb-2.5 text-body-lg font-bold text-ink">
          Biblioteca · {creatives.length}
        </h2>
        <CreativeLibrary items={creatives} />
      </section>
    </div>
  );
}
