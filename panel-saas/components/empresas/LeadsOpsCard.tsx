'use client';

import { useState, useTransition } from 'react';
import { opsSaveMetaPage, opsSetLeadsEnabled } from '@/app/actions/leads-ops';
import { usePanelUI } from '@/context/PanelUIContext';
import type { OpsLeadFlag, OpsLeadFlags } from '@/lib/leads-ops';

export default function LeadsOpsCard({ flags }: { flags: OpsLeadFlags }) {
  const { toast } = usePanelUI();
  const [rows, setRows] = useState<OpsLeadFlag[]>(flags.rows);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  if (!flags.ready && flags.missing) {
    return (
      <div className="rounded-card border border-[#FDE68A] bg-[#FFFBEB] p-5">
        <h2 className="text-[16px] font-bold">Leads</h2>
        <p className="mt-2 text-[14px] text-ink-2">
          Falta aplicar la migración de leads en la base. Cuando esté, aquí se enciende por centro.
        </p>
      </div>
    );
  }

  if (!flags.ready) {
    return (
      <div className="rounded-card bg-white p-5">
        <h2 className="text-[16px] font-bold">Leads</h2>
        <p className="mt-2 text-[14px] text-ink-2">No se ha podido leer la base.</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  const toggle = (row: OpsLeadFlag) => {
    const next = !row.enabled;
    setPendingId(row.id);
    start(async () => {
      const res = await opsSetLeadsEnabled(row.id, next);
      setPendingId(null);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setRows(current => current.map(item => item.id === row.id ? { ...item, enabled: next } : item));
      toast(next ? `Leads encendido en ${row.name}` : `Leads apagado en ${row.name}`);
    });
  };

  return (
    <div className="rounded-card bg-white p-5 lg:col-span-2">
      <h2 className="text-[16px] font-bold">Leads</h2>
      <p className="mt-1 text-[13px] text-ink-2">
        Lo enciende OPS, centro a centro. Con la función activa, cada lead nuevo avisa en el teléfono y abre esa ficha.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map(row => (
          <li key={row.id} className="rounded-[14px] bg-[#F7F7F8] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold">{row.name}</span>
                <span className="block text-[12px] text-ink-3">{row.enabled ? 'Activo en la app' : 'Oculto en la app'}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={row.enabled}
                aria-label={`Leads de ${row.name}`}
                disabled={pendingId === row.id}
                onClick={() => toggle(row)}
                className={`relative h-7 w-12 shrink-0 rounded-pill transition ${row.enabled ? 'bg-[#15803D]' : 'bg-[#D4D4D8]'} disabled:opacity-60`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${row.enabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            {row.enabled && <MetaPageForm row={row} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetaPageForm({ row }: { row: OpsLeadFlag }) {
  const { toast } = usePanelUI();
  const [pageId, setPageId] = useState(row.pageId ?? '');
  const [pageName, setPageName] = useState(row.pageName ?? '');
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(row.hasToken);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-3 grid gap-2 border-t border-[#E4E4E7] pt-3"
      onSubmit={e => {
        e.preventDefault();
        start(async () => {
          const res = await opsSaveMetaPage({
            salonId: row.id,
            pageId,
            pageName,
            token,
          });
          if (!res.ok) {
            toast(res.error);
            return;
          }
          setToken('');
          setSaved(true);
          toast('Página de Meta guardada');
        });
      }}
    >
      <p className="text-[12px] text-ink-3">
        Una página de Facebook por centro. El token no se vuelve a mostrar.
        {saved ? ' Ya hay uno guardado.' : ''}
      </p>
      <input
        value={pageId}
        onChange={e => setPageId(e.target.value)}
        inputMode="numeric"
        placeholder="Id de la página"
        aria-label={`Id de la página de ${row.name}`}
        className="h-10 rounded-[12px] border border-[#E4E4E7] bg-white px-3 text-[14px]"
      />
      <input
        value={pageName}
        onChange={e => setPageName(e.target.value)}
        placeholder="Nombre de la página"
        aria-label={`Nombre de la página de ${row.name}`}
        className="h-10 rounded-[12px] border border-[#E4E4E7] bg-white px-3 text-[14px]"
      />
      <input
        value={token}
        onChange={e => setToken(e.target.value)}
        type="password"
        autoComplete="off"
        placeholder={saved ? 'Token nuevo, solo si lo cambias' : 'Token de la página'}
        aria-label={`Token de la página de ${row.name}`}
        className="h-10 rounded-[12px] border border-[#E4E4E7] bg-white px-3 text-[14px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-pill bg-ink text-[13px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Guardando…' : 'Guardar página'}
      </button>
    </form>
  );
}
