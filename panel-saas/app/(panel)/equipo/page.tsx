import PanelShell from '@/components/shell/PanelShell';
import { AUDIT_LOG, PERMISSIONS, TEAM } from '@/lib/mock/panel-fixtures';
import { initials } from '@/lib/format';

export default function EquipoPage() {
  return (
    <PanelShell title="Equipo" subtitle="Roles, permisos y registro de soporte">
      <div className="rounded-card bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold">Miembros</h2>
          <button type="button" className="h-10 rounded-pill bg-ink px-4 text-[13px] font-semibold text-white">Invitar</button>
        </div>
        <ul className="divide-y divide-line">
          {TEAM.map(m => (
            <li key={m.id} className="flex flex-wrap items-center gap-4 py-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-pill text-[12px] font-bold text-white" style={{ background: m.avatar }}>
                {initials(m.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{m.name}</p>
                <p className="text-[13px] text-ink-2">{m.email} · {m.last}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {(['Superadmin', 'Admin', 'Soporte', 'Finanzas'] as const).map(r => {
                  const on = m.role === r;
                  return (
                    <span
                      key={r}
                      className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${on ? (m.locked ? 'bg-grad text-white' : 'bg-ink text-white') : 'border border-line text-ink-2'}`}
                    >
                      {r}
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-card bg-white p-5 overflow-x-auto">
        <h2 className="mb-3 text-[16px] font-bold">Matriz de permisos</h2>
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="text-ink-3">
              <th className="pb-2 text-left font-semibold" />
              <th className="pb-2 font-semibold">Superadmin</th>
              <th className="pb-2 font-semibold">Admin</th>
              <th className="pb-2 font-semibold">Soporte</th>
              <th className="pb-2 font-semibold">Finanzas</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(p => (
              <tr key={p.label} className="border-t border-line">
                <td className="py-2.5 pr-4">{p.label}</td>
                <td className="py-2.5 text-center font-semibold">{p.su ? '✓' : '—'}</td>
                <td className="py-2.5 text-center font-semibold">{p.admin ? '✓' : '—'}</td>
                <td className="py-2.5 text-center font-semibold">{p.soporte ? '✓' : '—'}</td>
                <td className="py-2.5 text-center font-semibold">{p.finanzas ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-card bg-white p-5">
        <h2 className="mb-3 text-[16px] font-bold">Registro de accesos en modo soporte</h2>
        <ul className="divide-y divide-line">
          {AUDIT_LOG.map(a => (
            <li key={`${a.when}-${a.who}`} className="grid gap-1 py-3 sm:grid-cols-[100px_80px_1fr_auto] sm:items-center">
              <span className="text-[13px] text-ink-3">{a.when}</span>
              <span className="font-semibold">{a.who}</span>
              <span className="text-[14px]">{a.company} · {a.what}</span>
              <span className="text-[13px] text-ink-2">{a.duration}</span>
            </li>
          ))}
        </ul>
      </div>
    </PanelShell>
  );
}
