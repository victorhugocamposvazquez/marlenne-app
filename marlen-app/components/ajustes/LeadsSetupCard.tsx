'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveLeadsListGroup } from '@/app/actions/leads-settings';
import { saveLeadTemplate } from '@/app/actions/leads';
import { testLeadPushNotification } from '@/app/actions/lead-push-test';
import { createTestLead, importMetaLeadsPage } from '@/app/actions/leads-sync';
import { DEFAULT_LEAD_WA } from '@/lib/leads';
import type { LeadsListGroup } from '@/lib/leads-list-group';
import type { MetaSyncCursor } from '@/lib/meta-leads-sync';
import { metaSyncSummary } from '@/lib/leads-sync-summary';
import Chip from '@/components/ui/Chip';

const GROUPS: { id: LeadsListGroup; label: string; hint: string }[] = [
  { id: 'campaign', label: 'Campañas', hint: 'Filtros y listado por campaña.' },
  { id: 'ad', label: 'Anuncios', hint: 'Filtros y listado por anuncio.' },
];

export default function LeadsSetupCard({
  listGroup,
  salonTemplate,
}: {
  listGroup: LeadsListGroup;
  salonTemplate: string | null;
}) {
  const router = useRouter();
  const [group, setGroup] = useState(listGroup);
  const [template, setTemplate] = useState(salonTemplate?.trim() || DEFAULT_LEAD_WA);
  const [templateNote, setTemplateNote] = useState<string | null>(null);
  const [syncCursor, setSyncCursor] = useState<MetaSyncCursor | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [groupNote, setGroupNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [syncing, startSync] = useTransition();

  useEffect(() => {
    setTemplate(salonTemplate?.trim() || DEFAULT_LEAD_WA);
  }, [salonTemplate]);

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
            const res = await testLeadPushNotification('meta');
            setSyncNote(res.ok ? `Aviso Meta enviado a ${res.sent} móvil${res.sent === 1 ? '' : 'es'}.` : res.error);
          })}
          className="min-h-[44px] rounded-pill bg-surface-soft px-4 text-label font-bold text-ink disabled:opacity-50"
        >
          Probar aviso Meta
        </button>
        <button
          type="button"
          disabled={syncing}
          onClick={() => startSync(async () => {
            const res = await testLeadPushNotification('manual');
            setSyncNote(res.ok ? `Aviso manual enviado a ${res.sent} móvil${res.sent === 1 ? '' : 'es'}.` : res.error);
          })}
          className="min-h-[44px] rounded-pill bg-surface-soft px-4 text-label font-bold text-ink disabled:opacity-50"
        >
          Probar aviso manual
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

      <form
        id="plantilla"
        className="mt-6 border-t border-surface-soft pt-6"
        onSubmit={e => {
          e.preventDefault();
          setTemplateNote(null);
          start(async () => {
            const res = await saveLeadTemplate({ scope: 'salon', body: template });
            setTemplateNote(res.ok ? 'Plantilla guardada.' : res.error);
            if (res.ok) router.refresh();
          });
        }}
      >
        <h2 className="text-body font-bold text-ink">WhatsApp del centro</h2>
        <p className="mt-1 text-label leading-snug text-ink-2">
          Texto por defecto al abrir WhatsApp desde un lead. Si el anuncio o la campaña tienen el suyo, mandan ellos.
          Comodines: {'{{nombre}}'} {'{{campaña}}'} {'{{anuncio}}'} {'{{centro}}'}.
        </p>
        <p className="mt-1 text-label text-ink-3">
          Plantillas solo de una campaña o anuncio se guardan en la ficha de un lead de esa campaña.
        </p>
        <textarea
          value={template}
          onChange={e => setTemplate(e.target.value)}
          rows={4}
          aria-label="Plantilla WhatsApp del centro"
          className="mt-3 w-full rounded-field bg-surface-soft px-4 py-3 text-[16px] font-medium outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="mt-2 min-h-[44px] rounded-pill bg-ink px-4 text-label font-bold text-white disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Guardar plantilla'}
        </button>
        {templateNote && (
          <p className={`mt-2 text-label font-semibold ${templateNote === 'Plantilla guardada.' ? 'text-ink-2' : 'text-danger-fg'}`}>
            {templateNote}
          </p>
        )}
      </form>
    </div>
  );
}