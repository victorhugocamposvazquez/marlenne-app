'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import CsvFileField from '@/components/ui/CsvFileField';
import { applyCsvImport } from '@/lib/csv-import-apply';
import { buildPreview, peekAppointmentDates, type ImportPreview } from '@/lib/csv-import';
import {
  IMPORT_ROLES,
  applyColumnMapToCsv,
  applyEntityMapsToCsv,
  columnMapReady,
  listCsvHeaders,
  suggestColumnMap,
  uniqueMappedValues,
  type ColumnMap,
  type EntityMap,
  type ImportRole,
} from '@/lib/import-map';
import { readImportFile } from '@/lib/import-file';
import { createClient } from '@/lib/supabase/client';
import { fetchAllPages } from '@/lib/supabase/fetch-all';
import { toTimestamp } from '@/lib/time';
import type { CategoryId } from '@/lib/categories';

type StaffOpt = { id: string; full_name: string; is_active?: boolean };
type ServiceOpt = { id: string; name: string; category: CategoryId; duration_min: number; price_cents: number };

type Step = 'files' | 'columns' | 'entities' | 'preview';

async function readSpreadsheet(file: File | null) {
  if (!file) return undefined;
  return readImportFile(file);
}

export default function CsvImportCard() {
  const router = useRouter();
  const [servicesFile, setServicesFile] = useState<File | null>(null);
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [apptsFile, setApptsFile] = useState<File | null>(null);

  const [step, setStep] = useState<Step>('files');
  const [rawApptsCsv, setRawApptsCsv] = useState<string | null>(null);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [serviceMap, setServiceMap] = useState<EntityMap>({});
  const [staffMap, setStaffMap] = useState<EntityMap>({});
  const [canonicalCsv, setCanonicalCsv] = useState<string | null>(null);

  const [staffOpts, setStaffOpts] = useState<StaffOpt[]>([]);
  const [serviceOpts, setServiceOpts] = useState<ServiceOpt[]>([]);

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [importPct, setImportPct] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);

  const hasFile = !!(servicesFile || clientsFile || apptsFile);
  const headers = useMemo(
    () => (rawApptsCsv ? listCsvHeaders(rawApptsCsv) : []),
    [rawApptsCsv],
  );
  const uniqueServices = useMemo(
    () => (canonicalCsv ? uniqueMappedValues(canonicalCsv, 'servicio') : []),
    [canonicalCsv],
  );
  const uniqueStaff = useMemo(
    () => (canonicalCsv ? uniqueMappedValues(canonicalCsv, 'profesional') : []),
    [canonicalCsv],
  );

  const resetMapping = () => {
    setStep('files');
    setRawApptsCsv(null);
    setColumnMap({});
    setServiceMap({});
    setStaffMap({});
    setCanonicalCsv(null);
    setPreview(null);
  };

  const loadCatalog = async () => {
    const sb = createClient();
    const [services, staff] = await Promise.all([
      sb.from('services').select('id, name, category, duration_min, price_cents'),
      sb.from('staff').select('id, full_name, is_active'),
    ]);
    setServiceOpts((services.data ?? []) as ServiceOpt[]);
    setStaffOpts((staff.data ?? []) as StaffOpt[]);
    return {
      services: (services.data ?? []) as ServiceOpt[],
      staff: (staff.data ?? []) as StaffOpt[],
    };
  };

  const buildMappedAppointmentsCsv = (
    raw: string,
    cols: ColumnMap,
    svcMap: EntityMap,
    stMap: EntityMap,
  ) => applyEntityMapsToCsv(applyColumnMapToCsv(raw, cols), svcMap, stMap);

  const loadPreview = async (
    appointmentsCsv: string | undefined,
    servicesCsv: string | undefined,
    clientsCsv: string | undefined,
  ): Promise<ImportPreview | null> => {
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
      deriveFromAppointments: true,
      existing: {
        services: (services.data ?? []) as ServiceOpt[],
        clients,
        staff: staff.data ?? [],
        appointments: appts.data ?? [],
        blocks: blocks.data ?? [],
      },
    });
  };

  const startFromFiles = () => {
    if (!hasFile) {
      setError('Elige al menos un archivo.');
      return;
    }
    setError(null);
    setDoneMsg(null);
    startTransition(async () => {
      try {
        const [servicesCsv, clientsCsv, appointmentsCsv] = await Promise.all([
          readSpreadsheet(servicesFile),
          readSpreadsheet(clientsFile),
          readSpreadsheet(apptsFile),
        ]);
        await loadCatalog();

        if (appointmentsCsv) {
          setRawApptsCsv(appointmentsCsv);
          const map = suggestColumnMap(listCsvHeaders(appointmentsCsv));
          setColumnMap(map);
          setStep('columns');
          return;
        }

        const next = await loadPreview(undefined, servicesCsv, clientsCsv);
        if (!next) return;
        setPreview(next);
        setStep('preview');
        if (next.fileErrors.length) setError(next.fileErrors[0]);
      } catch {
        setError('No se ha podido leer el archivo. Prueba a guardarlo de nuevo desde Excel.');
      }
    });
  };

  const confirmColumns = () => {
    if (!rawApptsCsv) return;
    const err = columnMapReady(columnMap);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const canonical = applyColumnMapToCsv(rawApptsCsv, columnMap);
    setCanonicalCsv(canonical);

    const svcs = uniqueMappedValues(canonical, 'servicio');
    const stf = uniqueMappedValues(canonical, 'profesional');
    const nextSvc: EntityMap = {};
    for (const name of svcs) {
      const hit = serviceOpts.find(s => s.name.toLowerCase() === name.toLowerCase());
      nextSvc[name] = hit?.name ?? name;
    }
    const nextStaff: EntityMap = {};
    for (const name of stf) {
      const hit = staffOpts.find(s => s.full_name.toLowerCase() === name.toLowerCase());
      nextStaff[name] = hit?.full_name ?? '';
    }
    setServiceMap(nextSvc);
    setStaffMap(nextStaff);
    setStep('entities');
  };

  const confirmEntities = () => {
    const missing = uniqueStaff.filter(n => !staffMap[n]?.trim());
    if (missing.length) {
      setError(`Asocia las profesionales: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (!rawApptsCsv) return;
        const mapped = buildMappedAppointmentsCsv(rawApptsCsv, columnMap, serviceMap, staffMap);
        const [servicesCsv, clientsCsv] = await Promise.all([
          readSpreadsheet(servicesFile),
          readSpreadsheet(clientsFile),
        ]);
        const next = await loadPreview(mapped, servicesCsv, clientsCsv);
        if (!next) return;
        setPreview(next);
        setStep('preview');
        if (next.fileErrors.length) setError(next.fileErrors[0]);
      } catch {
        setError('No se ha podido preparar la vista previa.');
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
        setError('Haz primero la vista previa con el mapeo.');
        return;
      }
      if (active.fileErrors.length) {
        setError(active.fileErrors[0]);
        return;
      }
      const r = await applyCsvImport(createClient(), active, p => setImportPct(p.pct), {
        services: servicesFile?.name ?? (apptsFile ? 'derivado-citas' : null),
        clients: clientsFile?.name ?? (apptsFile ? 'derivado-citas' : null),
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
        r.phonesBackfilled ? `${r.phonesBackfilled} teléfonos actualizados` : null,
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
      resetMapping();
      router.refresh();
    } finally {
      setApplying(false);
      setImportPct(null);
    }
  };

  const setRole = (header: string, role: ImportRole) => {
    setColumnMap(prev => {
      const next = { ...prev };
      if (role !== 'ignore') {
        for (const [h, r] of Object.entries(next)) {
          if (h !== header && r === role) next[h] = 'ignore';
        }
      }
      next[header] = role;
      return next;
    });
  };

  return (
    <div className="rounded-row bg-surface-soft p-4">
      <ol className="list-decimal space-y-2 pl-5 text-body font-semibold leading-snug text-ink">
        <li>Exporta citas (CSV o Excel) desde SimplyBook, Treatwell u otra agenda.</li>
        <li>Súbelo y asocia columnas y nombres a Marlén.</li>
        <li>Revisa la vista previa e importa.</li>
      </ol>
      <p className="mt-2.5 text-label font-medium text-ink-2">
        Vale para cualquier proveedor: tú eliges qué columna es fecha, servicio, profesional…
      </p>

      {step === 'files' && (
        <>
          <CsvFileField accent label="Servicios (opcional)" file={servicesFile} optional onChange={f => { setServicesFile(f); setPreview(null); }} />
          <CsvFileField accent label="Client@s (opcional)" file={clientsFile} optional onChange={f => { setClientsFile(f); setPreview(null); }} />
          <CsvFileField accent label="Citas" file={apptsFile} optional onChange={f => { setApptsFile(f); setPreview(null); }} />
          <p className="mt-2 text-caption font-medium text-ink-3">
            Con solo el archivo de citas, Marlén crea clientas y servicios que falten.
          </p>
        </>
      )}

      {step === 'columns' && (
        <div className="mt-3 space-y-2">
          <p className="text-label font-semibold text-ink">¿Qué es cada columna?</p>
          <ul className="max-h-72 space-y-2 overflow-auto">
            {headers.map(h => (
              <li key={h} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-caption font-medium text-ink-2" title={h}>{h}</span>
                <select
                  className="max-w-[55%] rounded-md border border-surface-line bg-white px-2 py-1.5 text-caption font-semibold text-ink"
                  value={columnMap[h] ?? 'ignore'}
                  onChange={e => setRole(h, e.target.value as ImportRole)}
                >
                  {IMPORT_ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'entities' && (
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-label font-semibold text-ink">Profesionales del archivo → equipo Marlén</p>
            <ul className="mt-2 max-h-48 space-y-2 overflow-auto">
              {uniqueStaff.map(name => (
                <li key={name} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-caption font-medium text-ink-2">{name}</span>
                  <select
                    className="max-w-[55%] rounded-md border border-surface-line bg-white px-2 py-1.5 text-caption font-semibold text-ink"
                    value={staffMap[name] ?? ''}
                    onChange={e => setStaffMap(prev => ({ ...prev, [name]: e.target.value }))}
                  >
                    <option value="">Elegir…</option>
                    {staffOpts.filter(s => s.is_active !== false).map(s => (
                      <option key={s.id} value={s.full_name}>{s.full_name}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-label font-semibold text-ink">Servicios del archivo</p>
            <p className="text-caption font-medium text-ink-3">
              Si no existe en Marlén, se crea con la duración del horario del CSV.
            </p>
            <ul className="mt-2 max-h-48 space-y-2 overflow-auto">
              {uniqueServices.map(name => (
                <li key={name} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-caption font-medium text-ink-2">{name}</span>
                  <select
                    className="max-w-[55%] rounded-md border border-surface-line bg-white px-2 py-1.5 text-caption font-semibold text-ink"
                    value={serviceMap[name] ?? name}
                    onChange={e => setServiceMap(prev => ({ ...prev, [name]: e.target.value }))}
                  >
                    <option value={name}>Crear «{name}»</option>
                    {serviceOpts.map(s => (
                      <option key={s.id} value={s.name}>Usar {s.name}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {importPct != null && (
        <div className="mt-3" role="progressbar" aria-valuenow={importPct} aria-valuemin={0} aria-valuemax={100}>
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

      {step === 'preview' && preview && (
        <ul className="mt-3 space-y-1 text-label font-medium text-ink-2">
          {!!preview.services.length && (
            <li>Servicios: {preview.counts.servicesNew} altas, {preview.counts.servicesSkip} ya estaban o no valen</li>
          )}
          {!!preview.clients.length && (
            <li>
              Clientas: {preview.counts.clientsNew} altas, {preview.counts.clientsSkip} ya en la agenda
            </li>
          )}
          {!!preview.appointments.length && (
            <li>
              Citas: {preview.counts.apptsNew} a crear, {preview.counts.apptsSkip} fuera
              {preview.counts.apptsOverlap ? ` (${preview.counts.apptsOverlap} pisan)` : ''}
            </li>
          )}
        </ul>
      )}

      {step === 'preview' && preview?.appointments.some(a => a.action === 'skip' && a.skipReason) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-label font-bold text-ink-2">Citas que no entran</summary>
          <ul className="mt-1 max-h-40 overflow-auto text-caption font-medium text-ink-3">
            {preview.appointments.filter(a => a.action === 'skip').slice(0, 40).map(a => (
              <li key={a.row}>Fila {a.row}: {a.client_name} · {a.skipReason}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {step !== 'files' && (
          <Button
            variant="secondary"
            className="flex-1"
            disabled={pending || applying}
            onClick={() => {
              setError(null);
              if (step === 'columns') resetMapping();
              else if (step === 'entities') setStep('columns');
              else if (step === 'preview') setStep(apptsFile ? 'entities' : 'files');
            }}
          >
            Atrás
          </Button>
        )}
        {step === 'files' && (
          <Button variant="ink" className="flex-1" disabled={pending || applying || !hasFile} onClick={startFromFiles}>
            {pending ? 'Leyendo…' : apptsFile ? 'Continuar' : 'Vista previa'}
          </Button>
        )}
        {step === 'columns' && (
          <Button variant="ink" className="flex-1" disabled={pending || applying} onClick={confirmColumns}>
            Continuar
          </Button>
        )}
        {step === 'entities' && (
          <Button variant="ink" className="flex-1" disabled={pending || applying} onClick={confirmEntities}>
            {pending ? 'Preparando…' : 'Vista previa'}
          </Button>
        )}
        {step === 'preview' && (
          <Button variant="ink" className="flex-1" disabled={pending || applying || !preview} onClick={() => void apply()}>
            {applying ? 'Importando…' : 'Importar'}
          </Button>
        )}
      </div>
    </div>
  );
}
