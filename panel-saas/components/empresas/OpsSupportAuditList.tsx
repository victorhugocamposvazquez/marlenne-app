import type { OpsAuditRow } from '@/lib/ops-support-audit';

function actionLabel(action: string) {
  const map: Record<string, string> = {
    link_created: 'Enlace de entrada',
    session_start: 'Sesión en la app',
    'appointment.create': 'Cita creada',
    'appointment.cancel': 'Cita cancelada',
    'appointment.move': 'Cita movida',
    'appointment.status': 'Estado de cita',
    'client.create': 'Clienta nueva',
    'client.update': 'Ficha clienta',
  };
  return map[action] ?? action;
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OpsSupportAuditList({ rows }: { rows: OpsAuditRow[] }) {
  if (!rows.length) {
    return (
      <p className="text-[14px] text-ink-2">
        Aún no hay entradas ni cambios registrados desde Ops.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line">
      {rows.map(r => (
        <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-2.5 text-[13px]">
          <span className="font-bold text-ink">{actionLabel(r.action)}</span>
          <span className="text-ink-3">{fmtWhen(r.when)}</span>
          <span className="w-full text-ink-2">
            {r.opsEmail}
            {r.staffName ? ` · como ${r.staffName}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}
