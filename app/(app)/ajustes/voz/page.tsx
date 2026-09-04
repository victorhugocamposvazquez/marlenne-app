import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/require-session';
import { VOICE_OUTCOMES, listVoiceEvents } from '@/lib/voice-events';
import { TZ } from '@/lib/time';
import AjustesHeader from '@/components/ajustes/AjustesHeader';

const when = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ, weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default async function VozPage() {
  const me = await requireSession();
  if (me.role !== 'admin') redirect('/ajustes');
  const rows = await listVoiceEvents();

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.outcome, (counts.get(r.outcome) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);

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
