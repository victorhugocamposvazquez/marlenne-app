'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import StatusPill from '@/components/ui/StatusPill';
import { eur, initials } from '@/lib/format';
import type { Company, CompanyPlan, CompanyStatus } from '@/lib/types';

const PAGE_SIZES = [25, 50, 100] as const;

export default function EmpresasTable({ companies }: { companies: Company[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'Todos' | CompanyStatus>('Todos');
  const [plan, setPlan] = useState<'Todos' | CompanyPlan>('Todos');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return companies.filter(c => {
      if (status !== 'Todos' && c.status !== status) return false;
      if (plan !== 'Todos' && c.plan !== plan) return false;
      if (!needle) return true;
      const hay = `${c.name} ${c.city} ${c.contact} ${c.email}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [companies, q, status, plan]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const rows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const from = filtered.length ? safePage * pageSize + 1 : 0;
  const to = Math.min(filtered.length, (safePage + 1) * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="hidden text-[14px] text-ink-2 lg:block">{filtered.length.toLocaleString('es-ES')} empresas</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex h-11 items-center gap-2 rounded-pill border-[1.5px] border-line bg-white px-4 text-[13px] font-semibold">
            <Download size={15} /> Exportar
          </button>
          <button type="button" className="inline-flex h-11 items-center gap-2 rounded-pill bg-grad px-4 text-[14px] font-bold text-white shadow-brand">
            <Plus size={16} /> Alta
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-11 min-w-[260px] flex-1 items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-white px-3.5">
          <Search size={16} className="text-ink-3" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0); }}
            placeholder="Buscar por nombre, ciudad, contacto o correo"
            className="min-w-0 flex-1 border-none bg-transparent text-[14px] outline-none"
          />
        </label>
        <select value={status} onChange={e => { setStatus(e.target.value as typeof status); setPage(0); }} className="h-11 rounded-[14px] border-[1.5px] border-line bg-white px-3 text-[13px] font-semibold">
          {['Todos', 'Activa', 'Prueba', 'Impago', 'Pausada'].map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={plan} onChange={e => { setPlan(e.target.value as typeof plan); setPage(0); }} className="h-11 rounded-[14px] border-[1.5px] border-line bg-white px-3 text-[13px] font-semibold">
          {['Todos', 'Básico', 'Pro', 'Premium'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <div className="hidden grid-cols-[minmax(0,3fr)_minmax(0,.8fr)_minmax(0,.9fr)_minmax(0,1.1fr)_minmax(0,.7fr)_minmax(0,.9fr)] gap-3 border-b border-line bg-[#FAFAFC] px-4 py-2.5 text-[12px] font-semibold text-ink-2 lg:grid">
          <span>Empresa</span><span>Plan</span><span>Estado</span><span>SMS</span><span className="text-right">Cuota/mes</span><span>Próximo cobro</span>
        </div>
        {rows.map(c => {
          const pct = c.smsTotal ? Math.round((c.smsLeft / c.smsTotal) * 100) : 0;
          const smsColor = pct < 20 ? '#E11D48' : pct < 50 ? '#F59E0B' : '#22C55E';
          return (
            <Link
              key={c.id}
              href={`/empresas/${c.id}`}
              className="grid grid-cols-1 gap-2 border-b border-line px-4 py-3 hover:bg-page lg:grid-cols-[minmax(0,3fr)_minmax(0,.8fr)_minmax(0,.9fr)_minmax(0,1.1fr)_minmax(0,.7fr)_minmax(0,.9fr)] lg:items-center lg:gap-3 lg:py-0"
            >
              <div className="flex items-center gap-3 lg:py-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[11px] font-bold text-white" style={{ background: c.avatar }}>{initials(c.name)}</span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold">{c.name}</p>
                  <p className="truncate text-[12px] text-ink-2">{c.city}</p>
                </div>
              </div>
              <span className="text-[13px] font-semibold lg:block">{c.plan}</span>
              <StatusPill status={c.status} />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold" style={{ color: smsColor }}>{c.smsLeft} / {c.smsTotal}</p>
                <span className="mt-1 block h-1 overflow-hidden rounded-pill bg-line"><span className="block h-full rounded-pill" style={{ width: `${pct}%`, background: smsColor }} /></span>
              </div>
              <span className="text-[13px] font-semibold lg:text-right">{eur(c.price)}</span>
              <span className="truncate text-[13px] text-ink-2">{c.next}</span>
            </Link>
          );
        })}
        {!rows.length && (
          <p className="p-10 text-center text-[14px] text-ink-2">Ninguna empresa coincide.</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFC] px-4 py-3 text-[13px]">
          <span>{from}–{to} de {filtered.length.toLocaleString('es-ES')}</span>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value) as typeof pageSize); setPage(0); }} className="rounded-[10px] border border-line bg-white px-2 py-1">
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n}/pág</option>)}
            </select>
            <button type="button" disabled={safePage <= 0} onClick={() => setPage(p => p - 1)} className="rounded-[10px] border border-line bg-white px-3 py-1 disabled:opacity-40">Anterior</button>
            <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="rounded-[10px] border border-line bg-white px-3 py-1 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
