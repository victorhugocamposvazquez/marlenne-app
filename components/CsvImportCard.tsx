'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import Button from '@/components/ui/Button';
import { applyCsvImport } from '@/lib/csv-import-apply';
import {
  buildPreview, CSV_TEMPLATES, peekAppointmentDates, type ImportPreview,
} from '@/lib/csv-import';
import { createClient } from '@/lib/supabase/client';
import { toTimestamp } from '@/lib/time';
import type { CategoryId } from '@/lib/categories';

function downloadTemplate(name: keyof typeof CSV_TEMPLATES) {
  const blob = new Blob([CSV_TEMPLATES[name]], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `${name}-marlenne.csv`;
  a.click();
  URL.revokeObjectURL(href);
}

async function readFile(file: File | null) {
  if (!file) return undefined;
  return file.text();
}

export default function CsvImportCard() {
  const router = useRouter();
  const [servicesFile, setServicesFile] = useState<File | null>(null);
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [apptsFile, setApptsFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const runPreview = () => {
    setError(null);
    setDoneMsg(null);
    startTransition(async () => {
      const [servicesCsv, clientsCsv, appointmentsCsv] = await Promise.all([
        readFile(servicesFile),
        readFile(clientsFile),
        readFile(apptsFile),
      ]);
      const sb = createClient();
      const range = appointmentsCsv ? peekAppointmentDates(appointmentsCsv) : null;
      const from = range ? toTimestamp(range.from, 0) : null;
      const to = range ? toTimestamp(range.to, 24 * 60 - 1) : null;
      const [services, clients, staff, appts, blocks] = await Promise.all([
        sb.from('services').select('id, name, category, duration_min, price_cents'),
        sb.from('clients').select('id, full_name, phone'),
        sb.from('staff').select('id, full_name, is_active'),
        from && to
          ? sb.from('appointments').select('provider_id, starts_at, ends_at, status').gte('starts_at', from).lte('starts_at', to)
          : Promise.resolve({ data: [] as { provider_id: string; starts_at: string; ends_at: string; status: string }[] }),
        from && to
          ? sb.from('time_blocks').select('provider_id, starts_at, ends_at').gte('starts_at', from).lte('starts_at', to)
          : Promise.resolve({ data: [] as { provider_id: string; starts_at: string; ends_at: string }[] }),
      ]);
      const next = buildPreview({
        servicesCsv,
        clientsCsv,
        appointmentsCsv,
        existing: {
          services: (services.data ?? []) as { id: string; name: string; category: CategoryId; duration_min: number; price_cents: number }[],
          clients: clients.data ?? [],
          staff: staff.data ?? [],
          appointments: appts.data ?? [],
          blocks: blocks.data ?? [],
        },
      });
      setPreview(next);
      if (next.fileErrors.length) setError(next.fileErrors[0]);
    });
  };

  const apply = () => {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const r = await applyCsvImport(createClient(), preview);
      if (!r.ok) {
        setError(r.error ?? 'No se ha podido importar');
        return;
      }
      const bits = [
        r.created.services ? `${r.created.services} servicios` : null,
        r.created.clients ? `${r.created.clients} clientas` : null,
        r.created.appointments ? `${r.created.appointments} citas` : null,
      ].filter(Boolean);
      setDoneMsg(
        bits.length
          ? `Listo: ${bits.join(', ')}${r.failedAppointments ? `. ${r.failedAppointments} citas no entraron.` : '.'}`
          : 'No había nada nuevo que crear.',
      );
      setPreview(null);
      router.refresh();
    });
  };

  return (
    <div className="rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
      <p className="text-label font-medium leading-snug text-ink-2">
        Una mudanza, no un sync. Tres CSV: servicios, clientas y citas. Primero el preview; luego se escribe.
        No crea logins ni importa packs, fotos ni consentimientos.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(['servicios', 'clientas', 'citas'] as const).map(name => (
          <button
            key={name}
            type="button"
            onClick={() => downloadTemplate(name)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-chip border border-surface-line bg-surface-bg px-3 text-label font-bold text-ink-2"
          >
            <Download size={14} strokeWidth={2.2} />
            Plantilla {name}
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Servicios</span>
        <input type="file" accept=".csv,text/csv" onChange={e => { setServicesFile(e.target.files?.[0] ?? null); setPreview(null); }} />
      </label>
      <label className="mt-2 block">
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Clientas</span>
        <input type="file" accept=".csv,text/csv" onChange={e => { setClientsFile(e.target.files?.[0] ?? null); setPreview(null); }} />
      </label>
      <label className="mt-2 block">
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Citas</span>
        <input type="file" accept=".csv,text/csv" onChange={e => { setApptsFile(e.target.files?.[0] ?? null); setPreview(null); }} />
      </label>

      {error && <p className="mt-3 text-label font-semibold text-danger-fg">{error}</p>}
      {doneMsg && <p className="mt-3 text-label font-semibold text-ok-fg">{doneMsg}</p>}

      {preview && (
        <ul className="mt-3 space-y-1 text-label font-medium text-ink-2">
          <li>Servicios: {preview.counts.servicesNew} altas, {preview.counts.servicesSkip} ya estaban o no valen</li>
          <li>Clientas: {preview.counts.clientsNew} altas, {preview.counts.clientsSkip} duplicadas (teléfono)</li>
          <li>
            Citas: {preview.counts.apptsNew} a crear, {preview.counts.apptsSkip} fuera
            {preview.counts.apptsOverlap ? ` (${preview.counts.apptsOverlap} pisan)` : ''}
          </li>
        </ul>
      )}

      {preview?.appointments.some(a => a.action === 'skip' && a.skipReason) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-label font-bold text-ink-2">Citas que no entran</summary>
          <ul className="mt-1 max-h-40 overflow-auto text-caption font-medium text-ink-3">
            {preview.appointments.filter(a => a.action === 'skip').slice(0, 40).map(a => (
              <li key={a.row}>Fila {a.row}: {a.client_name} · {a.skipReason}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-3 flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={pending} onClick={runPreview}>
          {pending && !preview ? 'Leyendo…' : 'Vista previa'}
        </Button>
        <Button className="flex-1" disabled={pending || !preview || !!preview.fileErrors.length} onClick={apply}>
          {pending && preview ? 'Importando…' : 'Importar'}
        </Button>
      </div>
    </div>
  );
}
