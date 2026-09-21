'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loadImportBatches } from '@/app/actions/import-batches';
import Button from '@/components/ui/Button';
import {
  clientBatchDeleteBlockedText,
  clientBatchDeletePartialConfirmText,
  batchHasClientas,
  deleteImportBatch,
  deleteImportBatchConfirmText,
  importBatchSummary,
  inspectClientBatchDelete,
  type ClientBatchDeleteInspect,
  type ImportBatchRow,
} from '@/lib/import-batch';
import { createClient } from '@/lib/supabase/client';

type Props = {
  initialBatches: ImportBatchRow[];
  loadError?: string | null;
};

type ConfirmMode = 'all' | 'partial';

export default function ImportBatchHistory({ initialBatches, loadError = null }: Props) {
  const router = useRouter();
  const [batches, setBatches] = useState(initialBatches);
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>('all');
  const [inspect, setInspect] = useState<ClientBatchDeleteInspect | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const confirmBatch = batches.find(b => b.id === confirmId) ?? null;

  useEffect(() => {
    setBatches(initialBatches);
  }, [initialBatches]);

  useEffect(() => {
    void loadImportBatches().then(({ batches: next, error: syncErr }) => {
      setBatches(next);
      if (syncErr) setError(`No se pudo sincronizar el historial: ${syncErr}`);
    });
  }, []);

  const closeConfirm = () => {
    setConfirmId(null);
    setConfirmMode('all');
    setInspect(null);
    setInspecting(false);
  };

  const openConfirm = (batch: ImportBatchRow) => {
    setError(null);
    setMsg(null);
    setConfirmMode('all');
    setInspect(null);
    setConfirmId(batch.id);

    if (!batchHasClientas(batch)) return;

    setInspecting(true);
    void inspectClientBatchDelete(createClient(), batch.id).then(result => {
      setInspect(result);
      setInspecting(false);
    });
  };

  const remove = (batch: ImportBatchRow, partial: boolean) => {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const r = await deleteImportBatch(createClient(), batch.id, {
        onlyClientsWithoutAppointments: partial,
      });
      closeConfirm();
      if (!r.ok && r.deleted === 0) {
        setError(r.error ?? 'No se pudo eliminar la importación');
        return;
      }
      const bits = [`${r.deleted} borrados`];
      if (r.skipped) bits.push(`${r.skipped} no se tocaron`);
      setMsg(`Importación eliminada: ${bits.join(', ')}.${r.skippedReason ? ` ${r.skippedReason}.` : ''}`);
      router.refresh();
    });
  };

  return (
    <div className="mt-4 rounded-row bg-surface-soft p-4">
      <h2 className="text-body font-bold text-ink">Importaciones recientes</h2>
      <p className="mt-1 text-label font-medium text-ink-2">
        Una línea por cada vez que pulsaste Importar. Últimos 30 días.
      </p>

      {error && <p className="mt-3 text-label font-semibold text-danger-fg">{error}</p>}
      {msg && <p className="mt-3 text-label font-semibold text-ok-fg">{msg}</p>}

      {!batches.length && !loadError && (
        <p className="mt-3 text-label font-medium text-ink-2">
          Aún no hay importaciones registradas. Tras importar, la última aparecerá aquí.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {batches.map(batch => (
          <li
            key={batch.id}
            className="flex flex-col gap-2 rounded-card border border-surface-line bg-surface px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="min-w-0 text-label font-medium text-ink-2">{importBatchSummary(batch)}</p>
            {confirmId === batch.id && confirmBatch ? (
              <div className="flex shrink-0 flex-col gap-2 sm:max-w-sm sm:items-end">
                {batchHasClientas(batch) && inspecting ? (
                  <p className="text-caption text-ink-3">Comprobando citas en agenda…</p>
                ) : batchHasClientas(batch) && inspect && !inspect.canDeleteAll && confirmMode === 'all' ? (
                  <>
                    <p className="text-caption font-medium text-danger-fg">{clientBatchDeleteBlockedText(inspect)}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" disabled={pending} onClick={closeConfirm}>
                        Dejarlo
                      </Button>
                      {inspect.deletableClients > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => setConfirmMode('partial')}
                        >
                          Eliminar {inspect.deletableClients} sin citas
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-caption text-ink-3">
                      {confirmMode === 'partial' && inspect
                        ? clientBatchDeletePartialConfirmText(batch, inspect)
                        : deleteImportBatchConfirmText(batch)}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" disabled={pending} onClick={closeConfirm}>
                        Cancelar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={pending || (batchHasClientas(batch) && inspecting)}
                        onClick={() => remove(batch, confirmMode === 'partial')}
                      >
                        {pending ? 'Borrando…' : confirmMode === 'partial' ? 'Eliminar sin citas' : 'Eliminar'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 self-start sm:self-auto"
                disabled={pending}
                onClick={() => openConfirm(batch)}
              >
                Eliminar importación
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
