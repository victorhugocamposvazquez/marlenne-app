import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarPlus, Mail, Pencil, Phone } from 'lucide-react';
import EditClientSheet from '@/components/clienta/EditClientSheet';
import ConsentsCard from '@/components/clienta/ConsentsCard';
import Tabs, { parseTab } from '@/components/clienta/Tabs';
import TreatmentsTab from '@/components/clienta/TreatmentsTab';
import MeasurementsTab from '@/components/clienta/MeasurementsTab';
import PhotosTab from '@/components/clienta/PhotosTab';
import HistoryTab from '@/components/clienta/HistoryTab';
import {
  requireSession, getClient, listClientAppointments, listConsents, signedPhotoUrls,
} from '@/lib/queries';
import { avatarColor, initials } from '@/lib/categories';
import { dateLbl } from '@/lib/time';

export default async function ClientaPage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; editar?: string };
}) {
  const me = await requireSession();
  const tab = parseTab(searchParams.tab);
  const canEdit = me.role === 'admin' || me.role === 'reception';
  const { client, treatments } = await getClient(params.id);
  if (!client) notFound();

  const photoPaths = treatments.flatMap(t => (t.treatment_photos ?? []).map(p => p.storage_path));

  const [appointments, consents, urls] = await Promise.all([
    listClientAppointments(client.id),
    listConsents(client.id),
    tab === 'fotos' ? signedPhotoUrls(photoPaths) : Promise.resolve({}),
  ]);

  const metrics = new Set(treatments.flatMap(t => (t.measurements ?? []).map(m => m.metric)));
  const age = client.birth_date
    ? Math.floor((Date.now() - +new Date(client.birth_date)) / 31557600000)
    : null;

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-5 pb-3 pt-5">
        <Link
          href="/clientas"
          className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-2 hover:text-v-d"
        >
          <ArrowLeft size={15} strokeWidth={2.4} />
          Clientas
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
              <Link
                href={`/clientas/${client.id}?tab=${tab}&editar=1`}
                aria-label="Editar ficha"
                className="grid h-[42px] w-[42px] place-items-center rounded-[14px] border border-surface-line bg-white text-ink-2 shadow-card"
              >
                <Pencil size={17} strokeWidth={2.2} />
              </Link>
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

        {client.notes && (
          <p className="mt-2.5 rounded-[12px] border border-surface-line bg-v-tint px-3 py-2 text-[12px] font-medium leading-snug text-ink-2">
            {client.notes}
          </p>
        )}

        <ConsentsCard clientId={client.id} consents={consents} canEdit={canEdit} />

        <div className="mt-3.5">
          <Tabs
            base={`/clientas/${client.id}`}
            active={tab}
            counts={{
              tratamientos: treatments.length,
              medidas: metrics.size,
              fotos: photoPaths.length,
              historial: appointments.length,
            }}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-5 pb-3 pt-0.5">
        {tab === 'tratamientos' && <TreatmentsTab treatments={treatments} />}
        {tab === 'medidas' && <MeasurementsTab treatments={treatments} />}
        {tab === 'fotos' && (
          <PhotosTab
            treatments={treatments}
            urls={urls}
            photoConsent={consents.some(c => c.kind === 'fotografia')}
          />
        )}
        {tab === 'historial' && <HistoryTab appointments={appointments} />}
      </div>
      {canEdit && searchParams.editar === '1' && <EditClientSheet client={client} />}
    </div>
  );
}
