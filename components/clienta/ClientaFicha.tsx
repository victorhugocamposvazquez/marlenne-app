'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarPlus, Mail, MessageCircle, Pencil, Phone } from 'lucide-react';
import EditClientSheet from '@/components/clienta/EditClientSheet';
import ConsentsCard from '@/components/clienta/ConsentsCard';
import QuickNotes from '@/components/clienta/QuickNotes';
import Tabs, { parseTab, type TabId } from '@/components/clienta/Tabs';
import TreatmentsTab from '@/components/clienta/TreatmentsTab';
import MeasurementsTab from '@/components/clienta/MeasurementsTab';
import PhotosTab from '@/components/clienta/PhotosTab';
import HistoryTab from '@/components/clienta/HistoryTab';
import { loadSignedPhotoUrls } from '@/lib/agenda-catalog';
import { createClient } from '@/lib/supabase/client';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import { avatarColor, initials } from '@/lib/categories';
import { waHref } from '@/lib/phone';
import { dateLbl, offsetFromDay, shortWhen } from '@/lib/time';
import type { AgendaAppt, ClientRow, Consent, TreatmentRow } from '@/lib/types';

export default function ClientaFicha({
  client, treatments, appointments, consents, canEdit, initialTab, initialEdit,
}: {
  client: ClientRow;
  treatments: TreatmentRow[];
  appointments: AgendaAppt[];
  consents: Consent[];
  canEdit: boolean;
  initialTab?: string;
  initialEdit?: boolean;
}) {
  const tab = parseTab(useShallowParam('tab', initialTab ?? null));
  const editar = useShallowParam('editar', initialEdit ? '1' : null);
  const router = useRouter();
  const [urls, setUrls] = useState<Record<string, string>>({});

  const photoPaths = treatments.flatMap(t => (t.treatment_photos ?? []).map(p => p.storage_path));
  const metrics = new Set(treatments.flatMap(t => (t.measurements ?? []).map(m => m.metric)));
  const age = client.birth_date
    ? Math.floor((Date.now() - +new Date(client.birth_date)) / 31557600000)
    : null;
  const upcoming = appointments
    .filter(a => (a.status === 'prog' || a.status === 'curso') && +new Date(a.starts_at) >= Date.now())
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const nextAppt = upcoming[0] ?? appointments.find(a => a.status === 'curso');
  const lastAppt = appointments.find(a => a.status === 'done');
  const wa = waHref(client.phone);

  useEffect(() => {
    if (tab !== 'fotos' || !photoPaths.length) return;
    let alive = true;
    void loadSignedPhotoUrls(createClient(), photoPaths).then(map => {
      if (alive) setUrls(map);
    });
    return () => { alive = false; };
  }, [tab, photoPaths.join('|')]);

  const goTab = (id: TabId) => shallowSet({ tab: id === 'tratamientos' ? null : id });

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-5">
      <Link
        href={canEdit ? '/clientas' : '/hoy'}
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-2 hover:text-v-d"
      >
        <ArrowLeft size={15} strokeWidth={2.4} />
        {canEdit ? 'Clientas' : 'Hoy'}
      </Link>

      <div className="flex items-start gap-3">
        <span
          className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[17px] text-[15px] font-bold text-white"
          style={{ background: avatarColor(client.full_name) }}
        >
          {initials(client.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[21px] font-extrabold leading-tight tracking-[-.025em]">
            {client.full_name}
          </h1>
          <p className="mt-0.5 text-[12px] font-medium text-ink-3">
            {[
              age !== null ? `${age} años` : null,
              `alta ${dateLbl(client.created_at)}`,
              client.sms_opt_in ? null : 'sin SMS',
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => shallowSet({ editar: '1' })}
              aria-label="Editar ficha"
              className="grid h-[42px] w-[42px] place-items-center rounded-[14px] border border-surface-line bg-white text-ink-2 shadow-card"
            >
              <Pencil size={17} strokeWidth={2.2} />
            </button>
          )}
          <Link
            href={`/agenda?new=1&client=${client.id}`}
            aria-label="Nueva cita para esta clienta"
            className="grid h-[42px] w-[42px] place-items-center rounded-[14px] bg-grad text-white shadow-btn"
          >
            <CalendarPlus size={19} strokeWidth={2.2} />
          </Link>
        </div>
      </div>

      {client.tags?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {client.tags.map(tag => (
            <span key={tag} className="rounded-[8px] bg-v-soft px-2 py-1 text-[10.5px] font-extrabold text-v-d">
              {tag}
            </span>
          ))}
        </div>
      )}

      {nextAppt && (
        <Link
          href={`/agenda?day=${offsetFromDay(nextAppt.starts_at)}&appt=${nextAppt.id}`}
          className="mt-2.5 flex items-center justify-between gap-2 rounded-[12px] border border-v/25 bg-v-tint px-3 py-2"
        >
          <span className="min-w-0">
            <span className="block text-[10.5px] font-bold uppercase tracking-[.03em] text-v-d">Próxima cita</span>
            <span className="block truncate text-[12.5px] font-bold text-ink">
              {shortWhen(nextAppt.starts_at)} · {nextAppt.service_name}
            </span>
          </span>
          <span className="shrink-0 text-[11.5px] font-bold text-v-d">Ver</span>
        </Link>
      )}
      {!nextAppt && lastAppt && (
        <p className="mt-2.5 text-[12px] font-medium text-ink-3">
          Última visita {shortWhen(lastAppt.starts_at)} · {lastAppt.service_name}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap gap-2">
        {client.phone && (
          <a
            href={`tel:${client.phone}`}
            className="flex items-center gap-1.5 rounded-chip border border-surface-line bg-white px-2.5 py-1.5 text-[12px] font-bold shadow-card"
          >
            <Phone size={13} strokeWidth={2.4} className="text-v" />
            {client.phone}
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-chip border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12px] font-bold text-emerald-800 shadow-card"
          >
            <MessageCircle size={13} strokeWidth={2.4} />
            WhatsApp
          </a>
        )}
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className="flex min-w-0 items-center gap-1.5 rounded-chip border border-surface-line bg-white px-2.5 py-1.5 text-[12px] font-bold shadow-card"
          >
            <Mail size={13} strokeWidth={2.4} className="text-v" />
            <span className="truncate">{client.email}</span>
          </a>
        )}
      </div>

      <QuickNotes clientId={client.id} notes={client.notes} canEdit={canEdit} />

      <ConsentsCard clientId={client.id} consents={consents} canEdit={canEdit} />

      <div className="mt-3.5">
        <Tabs
          active={tab}
          onSelect={goTab}
          counts={{
            tratamientos: treatments.length,
            medidas: metrics.size,
            fotos: photoPaths.length,
            historial: appointments.length,
          }}
        />
      </div>

      <div className="mt-3">
        {tab === 'tratamientos' && (
          <TreatmentsTab treatments={treatments} clientId={client.id} />
        )}
        {tab === 'medidas' && <MeasurementsTab treatments={treatments} />}
        {tab === 'fotos' && (
          <PhotosTab
            treatments={treatments}
            urls={urls}
            photoConsent={consents.some(c => c.kind === 'fotografia')}
            onUploaded={() => router.refresh()}
          />
        )}
        {tab === 'historial' && (
          <HistoryTab appointments={appointments} clientId={client.id} />
        )}
      </div>
      {canEdit && editar === '1' && <EditClientSheet client={client} />}
    </div>
  );
}
