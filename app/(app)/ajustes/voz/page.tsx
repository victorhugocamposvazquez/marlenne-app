import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/require-session';
import { VOICE_OUTCOMES, listVoiceEvents, topSaidFor } from '@/lib/voice-events';
import { TZ } from '@/lib/time';
import AjustesHeader from '@/components/ajustes/AjustesHeader';

const when = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ, weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

function PhraseList({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <p className="text-caption font-bold text-ink-2">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {rows.map(([said, n]) => (
          <span key={said} className="rounded-chip bg-surface-card px-2.5 py-1 text-caption font-semibold text-ink">
            «{said}»{n > 1 ? ` · ${n}` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function VozPage() {
  const me = await requireSession();
  if (me.role !== 'admin') redirect('/ajustes');
  const rows = await listVoiceEvents();

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.outcome, (counts.get(r.outcome) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const missedServices = topSaidFor(rows, 'no_service');
  const missedClients = topSaidFor(rows, 'no_client');
  const missedUnknown = topSaidFor(rows, 'unknown');

  return (
    <AjustesHeader title="Voz">
      <p className="text-caption font-medium leading-snug text-ink-2">
        Lo que se dijo y no salió, últimos 30 días. Sirve para añadir alias de servicios o nombres. Se borra solo.
      </p>
      {top.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {top.map(([k, n]) => (
            <span key={k} className="rounded-chip bg-v-soft px-2.5 py-1 text-caption font-bold text-v-d">
              {VOICE_OUTCOMES[k] ?? k} · {n}
            </span>
          ))}
        </div>
      )}
      {(missedServices.length > 0 || missedClients.length > 0 || missedUnknown.length > 0) && (
        <div className="mt-4 grid gap-3">
          {missedServices.length > 0 && (
            <PhraseList title="Servicios que no pilló" rows={missedServices} />
          )}
          {missedClients.length > 0 && (
            <PhraseList title="Nombres que no encontró" rows={missedClients} />
          )}
          {missedUnknown.length > 0 && (
            <PhraseList title="Frases que no entendió" rows={missedUnknown} />
          )}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="mt-4 text-body font-semibold text-ink-2">Nada apuntado. O todo va bien, o nadie usa la voz.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-row border border-surface-line bg-surface-card shadow-card">
          {rows.map(r => (
            <div key={r.id} className="border-b border-surface-line px-3.5 py-2.5 last:border-0">
              <p className="text-body font-bold">«{r.said}»</p>
              <p className="text-caption font-medium text-ink-2">
                {VOICE_OUTCOMES[r.outcome] ?? r.outcome}
                {r.detail ? ` · ${r.detail}` : ''}
                {' · '}
                {when.format(new Date(r.created_at))}
              </p>
            </div>
          ))}
        </div>
      )}
    </AjustesHeader>
  );
}
