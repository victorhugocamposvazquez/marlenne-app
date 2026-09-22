'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, ChevronRight, Download, Plus, Search } from 'lucide-react';
import FilterSelect from '@/components/ui/FilterSelect';
import ModalTrigger from '@/components/ui/ModalTrigger';
import PaginationBar from '@/components/ui/PaginationBar';
import StatusPill from '@/components/ui/StatusPill';
import { usePanelUI } from '@/context/PanelUIContext';
import { eur, initials, STATUS_COLOR } from '@/lib/format';
import type { Company, CompanyPlan, CompanyStatus } from '@/lib/types';

const PAGE_SIZES = [25, 50, 100] as const;
const STATUS_OPTS = ['Todos los estados', 'Activas', 'En prueba', 'Impagos', 'Pausadas'] as const;
const PLAN_OPTS = ['Todos los planes', 'Básico', 'Pro', 'Premium'] as const;
const SMS_OPTS = ['Cualquier cupo', 'Sin SMS', 'Menos del 15 %', 'Menos del 40 %'] as const;

type SortKey = 'name' | 'plan' | 'status' | 'sms' | 'mrr' | 'next';
type SmsFilter = (typeof SMS_OPTS)[number];
type StatusFilter = (typeof STATUS_OPTS)[number];

function mapStatusFilter(f: StatusFilter): CompanyStatus | null {
  if (f === 'Activas') return 'Activa';
  if (f === 'En prueba') return 'Prueba';
  if (f === 'Impagos') return 'Impago';
  if (f === 'Pausadas') return 'Pausada';
  return null;
}

function smsColor(c: Company): string {
  const p = c.smsTotal ? c.smsLeft / c.smsTotal : 0;
  if (c.status === 'Impago') return '#E11D48';
  if (p < 0.15) return '#E11D48';
  if (p < 0.4) return '#F59E0B';
  return '#22C55E';
}

function smsLabel(c: Company): string {
  if (c.smsLeft === 0) return 'Sin SMS';
  return `${c.smsLeft.toLocaleString('es-ES')} / ${c.smsTotal.toLocaleString('es-ES')}`;
}

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] border-ink-4 ${checked ? 'border-ink bg-ink' : 'bg-white'}`}
    >
      {checked && <Check size={12} className="text-white" strokeWidth={3} />}
    </button>
  );
}

const COLS: { key: SortKey; label: string; justify: string }[] = [
  { key: 'name', label: 'Empresa', justify: 'justify-start' },
  { key: 'plan', label: 'Plan', justify: 'justify-start' },
  { key: 'status', label: 'Estado', justify: 'justify-start' },
  { key: 'sms', label: 'SMS restantes', justify: 'justify-start' },
  { key: 'mrr', label: 'Cuota/mes', justify: 'justify-end' },
  { key: 'next', label: 'Próximo cobro', justify: 'justify-start' },
];

export default function EmpresasTable({ companies }: { companies: Company[] }) {
  const { toast } = usePanelUI();
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState<StatusFilter>('Todos los estados');
  const [fPlan, setFPlan] = useState<(typeof PLAN_OPTS)[number]>('Todos los planes');
  const [fSms, setFSms] = useState<SmsFilter>('Cualquier cupo');
  const [sort, setSort] = useState<SortKey>('name');
  const [dir, setDir] = useState<1 | -1>(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Record<number, true>>({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const status = mapStatusFilter(fStatus);
    const plan = fPlan === 'Todos los planes' ? null : (fPlan as CompanyPlan);

    let list = companies.filter(c => {
      if (status && c.status !== status) return false;
      if (plan && c.plan !== plan) return false;
      if (fSms === 'Sin SMS' && c.smsLeft !== 0) return false;
      if (fSms === 'Menos del 15 %' && (c.smsTotal === 0 || c.smsLeft / c.smsTotal >= 0.15)) return false;
      if (fSms === 'Menos del 40 %' && (c.smsTotal === 0 || c.smsLeft / c.smsTotal >= 0.4)) return false;
      if (!needle) return true;
      const hay = `${c.name} ${c.city} ${c.contact} ${c.email}`.toLowerCase();
      return hay.includes(needle);
    });

    const keyFn: Record<SortKey, (c: Company) => string | number> = {
      name: c => c.name,
      plan: c => c.price,
      status: c => c.status,
      sms: c => (c.smsTotal ? c.smsLeft / c.smsTotal : 0),
      mrr: c => (c.status === 'Activa' ? c.price : 0),
      next: c => c.next,
    };
    list = [...list].sort((a, b) => {
      const A = keyFn[sort](a);
      const B = keyFn[sort](b);
      return (A > B ? 1 : A < B ? -1 : 0) * dir;
    });
    return list;
  }, [companies, q, fStatus, fPlan, fSms, sort, dir]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = filtered.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(filtered.length, safePage * pageSize);
  const selCount = Object.keys(sel).length;
  const allOn = rows.length > 0 && rows.every(c => sel[c.id]);
  const hasFilters = !!q.trim() || fStatus !== 'Todos los estados' || fPlan !== 'Todos los planes' || fSms !== 'Cualquier cupo';

  const sortBy = (k: SortKey) => {
    if (sort === k) setDir(d => (d === 1 ? -1 : 1));
    else { setSort(k); setDir(1); }
    setPage(1);
  };

  const toggleRow = (id: number) => {
    setSel(s => {
      const next = { ...s };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const toggleAllPage = () => {
    setSel(s => {
      const next = { ...s };
      rows.forEach(c => {
        if (allOn) delete next[c.id];
        else next[c.id] = true;
      });
      return next;
    });
  };

  const clearFilters = () => {
    setQ('');
    setFStatus('Todos los estados');
    setFPlan('Todos los planes');
    setFSms('Cualquier cupo');
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="hidden text-[14px] text-ink-2 lg:block">{filtered.length.toLocaleString('es-ES')} empresas</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toast(`Exportando ${filtered.length.toLocaleString('es-ES')} empresas a CSV`)}
            className="inline-flex h-11 items-center gap-2 rounded-pill border-[1.5px] border-line bg-white px-4 text-[13px] font-semibold"
          >
            <Download size={15} /> Exportar
          </button>
          <ModalTrigger kind="company" className="inline-flex h-11 items-center gap-2 rounded-pill bg-grad px-4 text-[14px] font-bold text-white shadow-brand">
            <Plus size={16} /> Alta
          </ModalTrigger>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-11 min-w-[260px] flex-1 items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-white px-3.5">
          <Search size={16} className="text-ink-3" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, ciudad, contacto o correo"
            className="min-w-0 flex-1 border-none bg-transparent text-[14px] outline-none"
          />
        </label>
        <FilterSelect label="Estado" value={fStatus} options={[...STATUS_OPTS]} onChange={v => { setFStatus(v as StatusFilter); setPage(1); }} />
        <FilterSelect label="Plan" value={fPlan} options={[...PLAN_OPTS]} onChange={v => { setFPlan(v as typeof fPlan); setPage(1); }} />
        <FilterSelect label="SMS" value={fSms} options={[...SMS_OPTS]} onChange={v => { setFSms(v as SmsFilter); setPage(1); }} />
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="h-11 px-3 text-[13px] font-semibold text-brand-pink">
            Limpiar
          </button>
        )}
      </div>

      {selCount > 0 && (
        <div className="flex h-[52px] flex-wrap items-center gap-3.5 rounded-[14px] bg-ink px-4 text-white">
          <span className="text-[13px] font-semibold">{selCount} seleccionadas</span>
          <div className="flex-1" />
          <button type="button" onClick={() => toast(`Bono añadido a ${selCount} empresas`)} className="h-8 rounded-pill border border-white/35 px-3 text-[12px] font-semibold">Añadir bono</button>
          <button type="button" onClick={() => toast(`Correo programado para ${selCount} empresas`)} className="h-8 rounded-pill border border-white/35 px-3 text-[12px] font-semibold">Enviar correo</button>
          <button type="button" onClick={() => toast(`${selCount} suscripciones pausadas`)} className="h-8 rounded-pill border border-white/35 px-3 text-[12px] font-semibold">Pausar</button>
          <button type="button" onClick={() => setSel({})} className="h-8 px-2 text-[12px] font-semibold text-[#B7B4C4]">Deseleccionar</button>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-line bg-white">
        {/* Desktop header */}
        <div className="hidden grid-cols-[36px_minmax(0,3fr)_minmax(0,.8fr)_minmax(0,.9fr)_minmax(0,1.1fr)_minmax(0,.7fr)_minmax(0,.9fr)_32px] items-center gap-3 border-b border-line bg-[#FAFAFC] px-4 py-2.5 lg:grid">
          <Checkbox checked={allOn} onToggle={toggleAllPage} />
          {COLS.map(col => (
            <button
              key={col.key}
              type="button"
              onClick={() => sortBy(col.key)}
              className={`flex items-center gap-1 border-none bg-transparent p-0 text-[12px] font-semibold ${col.justify} ${sort === col.key ? 'text-ink' : 'text-ink-3'}`}
            >
              {col.label}
              {sort === col.key && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={dir === 1 ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                </svg>
              )}
            </button>
          ))}
          <span />
        </div>

        {/* Desktop rows */}
        {rows.map(c => {
          const color = smsColor(c);
          const pct = c.smsTotal ? Math.round((c.smsLeft / c.smsTotal) * 100) : 0;
          const checked = !!sel[c.id];
          return (
            <div
              key={c.id}
              className={`hidden grid-cols-[36px_minmax(0,3fr)_minmax(0,.8fr)_minmax(0,.9fr)_minmax(0,1.1fr)_minmax(0,.7fr)_minmax(0,.9fr)_32px] items-center gap-3 border-b border-line px-4 lg:grid ${checked ? 'bg-[#FAF5FF]' : ''}`}
            >
              <Checkbox checked={checked} onToggle={() => toggleRow(c.id)} />
              <Link href={`/empresas/${c.id}`} className="flex min-w-0 items-center gap-3 py-3 hover:opacity-90">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[11px] font-bold text-white" style={{ background: c.avatar }}>{initials(c.name)}</span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold">{c.name}</p>
                  <p className="truncate text-[12px] text-ink-2">{c.city}</p>
                </div>
              </Link>
              <span className="text-[13px] font-semibold">{c.plan}</span>
              <StatusPill status={c.status} />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold" style={{ color }}>{smsLabel(c)}</p>
                <span className="mt-1 block h-1 overflow-hidden rounded-pill bg-line"><span className="block h-full rounded-pill" style={{ width: `${pct}%`, background: color }} /></span>
              </div>
              <span className="text-right text-[13px] font-semibold">{c.status === 'Activa' ? `${eur(c.price)}/mes` : '—'}</span>
              <span className="truncate text-[13px] text-ink-2">{c.next}</span>
              <Link href={`/empresas/${c.id}`} className="flex h-8 w-8 items-center justify-center rounded-pill hover:bg-page">
                <ChevronRight size={16} className="text-ink-4" />
              </Link>
            </div>
          );
        })}

        {/* Mobile rows */}
        {rows.map(c => {
          const smsC = smsColor(c);
          const stC = STATUS_COLOR[c.status] ?? '#9A97A8';
          return (
            <Link
              key={`m-${c.id}`}
              href={`/empresas/${c.id}`}
              className="flex items-center gap-3 border-b border-line px-3.5 py-3 lg:hidden"
            >
              <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white" style={{ background: c.avatar }}>{initials(c.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{c.name}</p>
                <p className="text-[12px] text-ink-2">{c.city} · {c.plan} · {c.status === 'Activa' ? `${eur(c.price)}/mes` : '—'}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: stC }}>
                  <span className="h-[7px] w-[7px] rounded-pill" style={{ background: stC }} />
                  {c.status}
                  <span className="font-normal text-ink-3">· {smsLabel(c)}</span>
                </p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-4" />
            </Link>
          );
        })}

        {!rows.length && (
          <p className="p-10 text-center text-[14px] text-ink-2">
            Ninguna empresa coincide.{' '}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="font-semibold text-brand-pink">Limpiar filtros</button>
            )}
          </p>
        )}

        <PaginationBar
          from={from}
          to={to}
          total={filtered.length}
          page={safePage}
          pages={pages}
          pageSize={pageSize}
          onPageSize={n => { setPageSize(n as typeof pageSize); setPage(1); }}
          onPage={setPage}
        />
      </div>
    </div>
  );
}
