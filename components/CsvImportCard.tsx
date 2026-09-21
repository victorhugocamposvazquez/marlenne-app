'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import CsvFileField from '@/components/ui/CsvFileField';
import { applyCsvImport } from '@/lib/csv-import-apply';
import { buildPreview, peekAppointmentDates, type ImportPreview } from '@/lib/csv-import';
import { readImportFile } from '@/lib/import-file';
import { createClient } from '@/lib/supabase/client';
import { fetchAllPages } from '@/lib/supabase/fetch-all';
import { toTimestamp } from '@/lib/time';
import type { CategoryId } from '@/lib/categories';

async function readSpreadsheet(file: File | null) {
  if (!file) return undefined;
  return readImportFile(file);
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
  const [importPct, setImportPct] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const importing = applying;

  const hasFile = !!(servicesFile || clientsFile || apptsFile);

  const loadPreview = async (): Promise<ImportPreview | null> => {
    const [servicesCsv, clientsCsv, appointmentsCsv] = await Promise.all([
      readSpreadsheet(servicesFile),
      readSpreadsheet(clientsFile),
      readSpreadsheet(apptsFile),
    ]);
    const sb = createClient();
    const range = appointmentsCsv ? peekAppointmentDates(appointmentsCsv) : null;
    const from = range ? toTimestamp(range.from, 0) : null;
    const to = range ? toTimestamp(range.to, 24 * 60 - 1) : null;
    const [services, clients, staff, appts, blocks] = await Promise.all([
      sb.from('services').select('id, name, category, duration_min, price_cents'),
      fetchAllPages((from, to) =>
        sb.from('clients').select('id, full_name, phone').order('full_name').range(from, to),
      ),
      sb.from('staff').select('id, full_name, is_active'),
      from && to
        ? sb.from('appointments').select('provider_id, starts_at, ends_at, status').gte('starts_at', from).lte('starts_at', to)
        : Promise.resolve({ data: [] as { provider_id: string; starts_at: string; ends_at: string; status: string }[] }),
      from && to
        ? sb.from('time_blocks').select('provider_id, starts_at, ends_at').gte('starts_at', from).lte('starts_at', to)
        : Promise.resolve({ data: [] as { provider_id: string; starts_at: string; ends_at: string }[] }),
    ]);
    return buildPreview({
      servicesCsv,
      clientsCsv,
      appointmentsCsv,
      existing: {
        services: (services.data ?? []) as { id: string; name: string; category: CategoryId; duration_min: number; price_cents: number }[],
        clients,
        staff: staff.data ?? [],
        appointments: appts.data ?? [],
        blocks: blocks.data ?? [],
      },
    });
  };

  const runPreview = () => {
    if (!hasFile) {
      setError('Elige al menos un archivo.');
      return;
    }
    setError(null);
    setDoneMsg(null);
    startTransition(async () => {
      try {
        const next = await loadPreview();
        if (!next) return;
        setPreview(next);
        if (next.fileErrors.length) setError(next.fileErrors[0]);
      } catch {
        setError('No se ha podido leer el archivo. Prueba a guardarlo de nuevo desde Excel.');
      }
    });
  };

  const apply = async () => {
    if (!hasFile || applying) return;
    setError(null);
    setDoneMsg(null);
    setApplying(true);
    setImportPct(0);
    try {
      let active = preview;
      if (!active) {
        try {
          active = await loadPreview();
        } catch {
          setError('No se ha podido leer el archivo. Prueba a guardarlo de nuevo desde Excel.');
          return;
        }
        if (!active) return;
        setPreview(active);
      }
      if (active.fileErrors.length) {
        setError(active.fileErrors[0]);
        return;
      }
      const r = await applyCsvImport(createClient(), active, p => setImportPct(p.pct), {
        services: servicesFile?.name ?? null,
        clients: clientsFile?.name ?? null,
        appointments: apptsFile?.name ?? null,
      });
      if (!r.ok) {
        setError(r.error ?? 'No se ha podido importar');
        return;
      }
      const bits = [
        r.created.services ? `${r.created.services} servicios` : null,
        r.created.clients ? `${r.created.clients} clientas` : null,
        r.created.appointments ? `${r.created.appointments} citas` : null,
      ].filter(Boolean);
      const fails = [
        r.failedClients ? `${r.failedClients} clientas no entraron` : null,
        r.failedAppointments ? `${r.failedAppointments} citas no entraron` : null,
      ].filter(Boolean);
      if (bits.length) {
        setDoneMsg(`Listo: ${bits.join(', ')}${fails.length ? `. ${fails.join(', ')}.` : '.'}`);
      } else if (fails.length) {
        setError(`Nada se guardó. ${fails.join(', ')}.`);
      } else {
        setDoneMsg('No había nada nuevo que crear (duplicados o filas no válidas).');
      }
      setPreview(null);
      setServicesFile(null);
      setClientsFile(null);
      setApptsFile(null);
      router.refresh();
    } finally {
      setApplying(false);
      setImportPct(null);
    }
  };

  return (
    <div className="rounded-row bg-surface-soft p-4">
      <ol className="list-decimal space-y-2 pl-5 text-body font-semibold leading-snug text-ink">
        <li>Descarga el Excel o CSV desde tu otra app, si aún no lo tienes.</li>
        <li>Súbelo aquí (vista previa opcional).</li>
        <li>Pulsa Importar.</li>
      </ol>
      <p className="mt-2.5 text-label font-medium text-ink-2">Sin plantilla — Marlén reconoce columnas habituales.</p>

      <CsvFileField accent label="Servicios" file={servicesFile} optional onChange={f => { setServicesFile(f); setPreview(null); }} />
      <CsvFileField accent label="Client@s" file={clientsFile} optional onChange={f => { setClientsFile(f); setPreview(null); }} />
      <CsvFileField accent label="Citas" file={apptsFile} optional onChange={f => { setApptsFile(f); setPreview(null); }} />

      {importing && (
        <div className="mt-3" role="progressbar" aria-valuenow={importPct ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <div className="mb-1.5 flex items-center justify-between text-caption font-semibold text-ink-2">
            <span>Importando…</span>
            <span className="tabular-nums text-ok-fg">{importPct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-pill bg-surface-line">
            <div
              className="h-full rounded-pill bg-ok transition-[width] duration-150 ease-out"
              style={{ width: `${importPct}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-label font-semibold text-danger-fg">{error}</p>}
      {doneMsg && <p className="mt-3 text-label font-semibold text-ok-fg">{doneMsg}</p>}

      {preview && (
        <ul className="mt-3 space-y-1 text-label font-medium text-ink-2">
          {!!preview.services.length && (
            <li>Servicios: {preview.counts.servicesNew} altas, {preview.counts.servicesSkip} ya estaban o no valen</li>
          )}
          {!!preview.clients.length && (
            <li>Clientas: {preview.counts.clientsNew} altas, {preview.counts.clientsSkip} duplicadas (teléfono o nombre)</li>
          )}
          {!!preview.appointments.length && (
            <li>
              Citas: {preview.counts.apptsNew} a crear, {preview.counts.apptsSkip} fuera
              {preview.counts.apptsOverlap ? ` (${preview.counts.apptsOverlap} pisan)` : ''}
            </li>
          )}
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
        <Button variant="secondary" className="flex-1" disabled={pending || applying || !hasFile} onClick={runPreview}>
          {pending && !preview && !applying ? 'Leyendo…' : 'Vista previa'}
        </Button>
        <Button variant="ink" className="flex-1" disabled={pending || applying || !hasFile} onClick={() => void apply()}>
          {applying && !preview ? 'Leyendo…' : applying ? 'Importando…' : 'Importar'}
        </Button>
      </div>
    </div>
  );
}
