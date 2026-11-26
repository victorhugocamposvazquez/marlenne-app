'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveLeadsListGroup } from '@/app/actions/leads-settings';
import { createTestLead, importMetaLeadsPage } from '@/app/actions/leads-sync';
import type { LeadsListGroup } from '@/lib/leads-list-group';
import type { MetaSyncCursor } from '@/lib/meta-leads-sync';
import { metaSyncSummary } from '@/lib/leads-sync-summary';
import Chip from '@/components/ui/Chip';

const GROUPS: { id: LeadsListGroup; label: string; hint: string }[] = [
  { id: 'campaign', label: 'Campañas', hint: 'Filtros y listado por campaña.' },
  { id: 'ad', label: 'Anuncios', hint: 'Filtros y listado por anuncio.' },
];

export default function LeadsSetupCard({ listGroup }: { listGroup: LeadsListGroup }) {
  const router = useRouter();
  const [group, setGroup] = useState(listGroup);
  const [syncCursor, setSyncCursor] = useState<MetaSyncCursor | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [groupNote, setGroupNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [syncing, startSync] = useTransition();

  const pickGroup = (next: LeadsListGroup) => {
    setGroupNote(null);
    start(async () => {
      const res = await saveLeadsListGroup(next);
      if (!res.ok) {
        setGroupNote(res.error);
        return;
      }
      setGroup(next);
      router.refresh();
    });
  };

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-surface-soft pt-6">
      <h2 className="text-body font-bold text-ink">Bandeja</h2>
      <p className="text-label leading-snug text-ink-2">
        Elige si en Leads los filtros horizontales y la segunda línea de cada ficha muestran campaña o anuncio.
      </p>
      <div className="flex flex-wrap gap-2">
        {GROUPS.map(item => (
          <Chip
            key={item.id}
            active={group === item.id}
            disabled={pending}
            onClick={() => { if (group !== item.id) pickGroup(item.id); }}
          >
            {item.label}
          </Chip>
        ))}
      </div>
      <p className="text-label text-ink-3">{GROUPS.find(g => g.id === group)?.hint}</p>
      {groupNote && <p className="text-label font-semibold text-danger-fg">{groupNote}</p>}

      <h2 className="mt-2 text-body font-bold text-ink">Facebook</h2>
      <p className="text-label leading-snug text-ink-2">
        Importa histórico o crea un lead de prueba. Los nuevos siguen entrando solos por el webhook.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={syncing}
          onClick={() => startSync(async () => {
            const res = await importMetaLeadsPage(syncCursor);
            setSyncNote(metaSyncSummary(res));
            if (!res.ok) return;
            setSyncCursor(res.done ? null : res.cursor);
            if (res.imported > 0) router.refresh();
          })}
          className="min-h-[44px] rounded-pill bg-ink px-4 text-label font-bold text-white disabled:opacity-50"
        >
          {syncing ? 'Trayendo…' : syncCursor ? 'Siguiente página' : 'Traer los de Facebook'}
        </button>
        <button
          type="button"
          disabled={syncing}
          onClick={() => startSync(async () => {
            const res = await createTestLead();
            if (!res.ok) {
              setSyncNote(res.error);
              return;
            }
            setSyncNote(res.via === 'meta' ? 'Lead de prueba creado en Facebook.' : 'Lead de prueba creado en la bandeja.');
            router.push(`/leads/${res.id}`);
          })}
          className="min-h-[44px] rounded-pill bg-surface-soft px-4 text-label font-bold text-ink disabled:opacity-50"
        >
          Lead de prueba
        </button>
      </div>
      {syncNote && <p className="text-label font-semibold text-ink-2">{syncNote}</p>}
    </div>
  );
}