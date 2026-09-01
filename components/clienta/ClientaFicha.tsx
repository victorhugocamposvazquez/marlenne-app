'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarPlus, Mail, MessageCircle, Pencil, Phone, ShieldAlert } from 'lucide-react';
import EditClientSheet from '@/components/clienta/EditClientSheet';
import ExportFichaButton from '@/components/clienta/ExportFichaButton';
import IconButton from '@/components/ui/IconButton';
import Badge from '@/components/ui/Badge';
import ConsentsCard from '@/components/clienta/ConsentsCard';
import QuickNotes from '@/components/clienta/QuickNotes';
import Tabs, { parseTab, type TabId } from '@/components/clienta/Tabs';
import TreatmentsTab from '@/components/clienta/TreatmentsTab';
import MeasurementsTab from '@/components/clienta/MeasurementsTab';
import PhotosTab from '@/components/clienta/PhotosTab';
import HistoryTab from '@/components/clienta/HistoryTab';
import PacksCard from '@/components/clienta/PacksCard';
import { loadSignedPhotoUrls } from '@/lib/agenda-catalog';
import { createClient } from '@/lib/supabase/client';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import { avatarColor, initials } from '@/lib/categories';
import { consentExpired, latestConsents } from '@/lib/consents';
import { waHref } from '@/lib/phone';
import { dateLbl, offsetFromDay, shortWhen } from '@/lib/time';
import type { AgendaAppt, ClientPack, ClientRow, Consent, PackTemplate, ServiceOption, TreatmentRow } from '@/lib/types';

export default function ClientaFicha({
  client, treatments, packs, templates, services, appointments, consents, canEdit, initialTab, initialEdit,
}: {
  client: ClientRow;
  treatments: TreatmentRow[];
  packs: ClientPack[];
  templates: PackTemplate[];
  services: ServiceOption[];
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
  const photoConsent = latestConsents(consents).get('fotografia');
  const photoConsentBad = photoPaths.length > 0 && (!photoConsent || consentExpired(photoConsent));

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
        className="mb-2 inline-flex min-h-[44px] items-center gap-1.5 text-label font-bold text-ink-2 hover:text-v-d"
      >
        <ArrowLeft size={15} strokeWidth={2.4} />
        {canEdit ? 'Clientas' : 'Hoy'}
      </Link>

      <div className="flex items-start gap-3">
        <span
          className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-field text-body-lg font-bold text-white"
          style={{ background: avatarColor(client.full_name) }}
        >
          {initials(client.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h1 font-extrabold leading-tight tracking-[-.025em]">
            {client.full_name}
          </h1>
          <p className="mt-0.5 text-label font-medium text-ink-2">
            {[
              age !== null ? `${age} años` : null,
              `alta ${dateLbl(client.created_at)}`,
              client.sms_opt_in ? null : 'sin SMS',
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canEdit && (
            <ExportFichaButton
              client={client}
              treatments={treatments}
              packs={packs}
              appointments={appointments}
              consents={consents}
            />
          )}
          {canEdit && (
            <IconButton label="Editar ficha" onClick={() => shallowSet({ editar: '1' })}>
              <Pencil size={17} strokeWidth={2.2} />
            </IconButton>
          )}
          <Link
            href={`/agenda?new=1&client=${client.id}`}
            aria-label="Nueva cita para esta clienta"
            className="grid h-11 w-11 place-items-center rounded-icon bg-grad text-white shadow-btn transition motion-safe:active:scale-[.96]"
          >
            <CalendarPlus size={19} strokeWidth={2.2} />
          </Link>
        </div>
      </div>

      {client.tags?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {client.tags.map(tag => (
            <Badge key={tag} tone="brand">{tag}</Badge>
          ))}
        </div>
      )}

      {photoConsentBad && (
        <p className="mt-2.5 flex items-start gap-2 rounded-row border border-warn-line bg-warn-bg p-3 text-label font-semibold leading-snug text-warn-fg">
          <ShieldAlert size={16} strokeWidth={2.2} className="mt-px shrink-0" />
          {photoConsent && consentExpired(photoConsent)
            ? `El consentimiento de fotos caducó el ${dateLbl(photoConsent.expires_at!)}. Renúevalo en Consentimientos.`
            : 'Hay fotos y no consta consentimiento de imagen. Conviene registrarlo antes de seguir usándolas.'}
        </p>
      )}

      {nextAppt && (
        <Link
          href={`/agenda?day=${offsetFromDay(nextAppt.starts_at)}&appt=${nextAppt.id}`}
          className="mt-2.5 flex items-center justify-between gap-2 rounded-row border border-v/25 bg-v-tint px-3.5 py-3"
        >
          <span className="min-w-0">
            <span className="block text-micro font-bold uppercase tracking-[.03em] text-v-d">Próxima cita</span>
            <span className="block truncate text-label font-bold text-ink">
              {shortWhen(nextAppt.starts_at)} · {nextAppt.service_name}
            </span>
          </span>
          <span className="shrink-0 text-caption font-bold text-v-d">Ver</span>
        </Link>
      )}
      {!nextAppt && lastAppt && (
        <p className="mt-2.5 text-label font-medium text-ink-2">
          Última visita {shortWhen(lastAppt.starts_at)} · {lastAppt.service_name}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap gap-2">
        {client.phone && (
          <a
            href={`tel:${client.phone}`}
            className="flex min-h-[44px] items-center gap-1.5 rounded-chip border border-surface-line bg-surface-card px-3 text-label font-bold shadow-card transition motion-safe:active:scale-[.97]"
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
            className="flex min-h-[44px] items-center gap-1.5 rounded-chip border border-ok-line bg-ok-bg px-3 text-label font-bold text-ok-strong shadow-card transition motion-safe:active:scale-[.97]"
          >
            <MessageCircle size={13} strokeWidth={2.4} />
            WhatsApp
          </a>
        )}
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className="flex min-h-[44px] min-w-0 items-center gap-1.5 rounded-chip border border-surface-line bg-surface-card px-3 text-label font-bold shadow-card transition motion-safe:active:scale-[.97]"
          >
            <Mail size={13} strokeWidth={2.4} className="text-v" />
            <span className="truncate">{client.email}</span>
          </a>
        )}
      </div>

      <QuickNotes clientId={client.id} notes={client.notes} canEdit={canEdit} />

      <ConsentsCard clientId={client.id} consents={consents} canEdit={canEdit} />

      <PacksCard
        clientId={client.id}
        clientName={client.full_name}
        packs={packs}
        templates={templates}
        services={services}
        canEdit={canEdit}
      />

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
      {canEdit && editar === '1' && (
        <EditClientSheet
          client={client}
          upcomingCount={upcoming.length}
          photoCount={photoPaths.length}
        />
      )}
    </div>
  );
}
