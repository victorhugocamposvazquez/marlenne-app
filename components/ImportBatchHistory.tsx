'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  deleteImportBatch,
  deleteImportBatchConfirmText,
  importBatchSummary,
  type ImportBatchRow,
} from '@/lib/import-batch';
import { createClient } from '@/lib/supabase/client';

type Props = {
  batches: ImportBatchRow[];
};

export default function ImportBatchHistory({ batches }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const remove = (batch: ImportBatchRow) => {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const r = await deleteImportBatch(createClient(), batch.id);
      setConfirmId(null);
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

  if (!batches.length) return null;

  return (
    <div className="mt-4 rounded-row bg-surface-soft p-4">
      <h2 className="text-body font-bold text-ink">Importaciones recientes</h2>
      <p className="mt-1 text-label text-ink-3">
        Últimos 30 días. Puedes deshacer una importación entera por fecha y hora.
      </p>

      {error && <p className="mt-3 text-label font-semibold text-danger-fg">{error}</p>}
      {msg && <p className="mt-3 text-label font-semibold text-ok-fg">{msg}</p>}

      <ul className="mt-3 space-y-2">
        {batches.map(batch => (
          <li
            key={batch.id}
            className="flex flex-col gap-2 rounded-card border border-surface-line bg-surface px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="min-w-0 text-label font-medium text-ink-2">{importBatchSummary(batch)}</p>
            {confirmId === batch.id ? (
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <p className="max-w-xs text-caption text-ink-3">{deleteImportBatchConfirmText(batch)}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={pending} onClick={() => setConfirmId(null)}>
                    Cancelar
                  </Button>
                  <Button variant="danger" size="sm" disabled={pending} onClick={() => remove(batch)}>
                    {pending ? 'Borrando…' : 'Eliminar'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 self-start sm:self-auto"
                disabled={pending}
                onClick={() => { setConfirmId(batch.id); setError(null); setMsg(null); }}
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
