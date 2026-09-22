'use client';

import { useMemo, useState } from 'react';
import KpiGrid from '@/components/ui/KpiGrid';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import { eur } from '@/lib/format';
import {
  EXPENSES,
  EXPENSE_CATEGORIES,
  FINANCE_HIST,
  FINANCE_INCOME,
  type ExpenseRow,
} from '@/lib/mock/panel-fixtures';

const PERIODS = ['Este mes', 'Trimestre', 'Año'] as const;
const TYPES = ['Todos', 'Variable', 'Fijo', 'Anual'] as const;

function typeStyle(type: ExpenseRow['type']): [string, string] {
  if (type === 'Variable') return ['#FFF7E6', '#8A5A00'];
  if (type === 'Fijo') return ['#F2F2F7', '#0F0E1A'];
  return ['#EAF3FF', '#0857B8'];
}

export default function FinanzasView() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('Este mes');
  const [type, setType] = useState<(typeof TYPES)[number]>('Todos');
  const [cat, setCat] = useState<string | null>(null);

  const mult = period === 'Este mes' ? 1 : period === 'Trimestre' ? 3 : 12;
  const totalOut = EXPENSES.reduce((a, e) => a + e.amount, 0);
  const prevOut = EXPENSES.reduce((a, e) => a + e.prev, 0);
  const income = FINANCE_INCOME.fees + FINANCE_INCOME.bonuses;
  const profit = income - totalOut;
  const margin = (profit / income) * 100;
  const active = 1006;

  const hist = useMemo(() => {
    const rows = [...FINANCE_HIST];
    rows[11] = { ...rows[11], expense: totalOut };
    const max = Math.max(...rows.map(h => h.income));
    return rows.map((h, k) => ({
      ...h,
      inH: Math.round((h.income / max) * 100),
      outH: Math.round((h.expense / max) * 100),
      current: k === 11,
    }));
  }, [totalOut]);

  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    EXPENSES.forEach(e => { m[e.category] = (m[e.category] ?? 0) + e.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, []);

  const list = EXPENSES
    .filter(e => (type === 'Todos' || e.type === type) && (!cat || e.category === cat))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-5">
      <SegmentedTabs tabs={[...PERIODS]} active={period} onChange={t => setPeriod(t as typeof period)} />

      <KpiGrid
        items={[
          { label: 'Ingresos', value: eur(income * mult), sub: `${eur(FINANCE_INCOME.fees * mult)} cuotas + ${eur(FINANCE_INCOME.bonuses * mult)} bonos` },
          {
            label: 'Gastos',
            value: eur(totalOut * mult),
            sub: `${eur(EXPENSES.filter(e => e.type !== 'Fijo').reduce((a, e) => a + e.amount, 0) * mult)} variables · ${eur(EXPENSES.filter(e => e.type === 'Fijo').reduce((a, e) => a + e.amount, 0) * mult)} fijos`,
            color: '#E11D48',
          },
          { label: 'Beneficio', value: eur(profit * mult), sub: 'antes de impuestos y nóminas', color: '#15803D' },
          { label: 'Margen', value: `${margin.toFixed(1).replace('.', ',')} %`, sub: 'vs mes anterior' },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-card bg-white p-5">
          <h2 className="mb-3 text-[16px] font-bold">Ingresos vs gastos (12 meses)</h2>
          <div className="flex h-32 items-end gap-1">
            {hist.map(h => (
              <div key={h.month} className="flex flex-1 flex-col items-center gap-0.5">
                <div className="flex w-full items-end justify-center gap-px" style={{ height: 100 }}>
                  <span className="w-[42%] rounded-t" style={{ height: `${h.inH}%`, background: h.current ? '#0F0E1A' : '#B7B4C4' }} />
                  <span className="w-[42%] rounded-t" style={{ height: `${h.outH}%`, background: h.current ? '#E11D48' : '#F4B8C6' }} />
                </div>
                <span className="text-[10px] text-ink-3">{h.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card bg-white p-5">
          <h2 className="mb-3 text-[16px] font-bold">Gastos por categoría</h2>
          {byCat.map(([label, v]) => (
            <button
              key={label}
              type="button"
              onClick={() => setCat(c => (c === label ? null : label))}
              className={`mb-2 flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left ${cat === label ? 'bg-page ring-1 ring-ink' : 'hover:bg-page'}`}
            >
              <span className="h-2.5 w-2.5 rounded-pill" style={{ background: EXPENSE_CATEGORIES[label] }} />
              <span className="flex-1 text-[14px]">{label}</span>
              <span className="text-[13px] font-semibold">{eur(v * mult)}</span>
              <span className="text-[12px] text-ink-3">{Math.round(v / totalOut * 100)} %</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-card bg-white p-5">
        <h2 className="mb-3 text-[16px] font-bold">Unidad económica por empresa activa</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Ingreso medio', value: `${(income / active).toFixed(2).replace('.', ',')} €`, hint: 'cuotas + bonos' },
            { label: 'Coste variable', value: `${(EXPENSES.filter(e => e.type === 'Variable' && e.category !== 'Marketing').reduce((a, e) => a + e.amount, 0) / active).toFixed(2).replace('.', ',')} €`, hint: 'SMS, Stripe…' },
            { label: 'Coste fijo repartido', value: `${(EXPENSES.filter(e => e.type !== 'Variable').reduce((a, e) => a + e.amount, 0) / active).toFixed(2).replace('.', ',')} €`, hint: 'infra, software' },
            { label: 'Margen / empresa', value: `${(profit / active).toFixed(2).replace('.', ',')} €`, hint: 'por mes' },
            { label: 'CAC', value: `${Math.round((1500 + 800 + 1860) / 131 * 3)} €`, hint: 'ads + referidos' },
          ].map(u => (
            <div key={u.label} className="rounded-[14px] bg-page p-4">
              <p className="text-[12px] font-semibold text-ink-2">{u.label}</p>
              <p className="mt-1 text-[18px] font-bold">{u.value}</p>
              <p className="text-[11px] text-ink-3">{u.hint}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-ink-2">
          El SMS es el gasto que manda: un Básico (29 €) con 200 SMS deja ~22 € de margen bruto; un Premium (89 €) que agota 1.500 SMS deja ~39 €.
        </p>
      </div>

      <div className="rounded-card bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold">Gastos digitales</h2>
          <div className="flex flex-wrap gap-1 rounded-pill bg-page p-1">
            {TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold ${type === t ? 'bg-ink text-white' : 'text-ink-2'}`}
              >
                {t === 'Todos' ? 'Todos' : t === 'Variable' ? 'Variables' : t === 'Fijo' ? 'Fijos' : 'Anuales'}
              </button>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-line">
          {list.map(r => {
            const d = r.prev ? ((r.amount - r.prev) / r.prev) * 100 : 0;
            const [tb, tc] = typeStyle(r.type);
            return (
              <li key={r.name} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="text-[14px] font-semibold">{r.name}</p>
                  <p className="text-[12px] text-ink-3">{r.note}</p>
                </div>
                <span className="rounded-pill px-2 py-0.5 text-[11px] font-semibold" style={{ background: tb, color: tc }}>{r.type}</span>
                <div className="text-right">
                  <p className="font-bold">{eur(r.amount * mult)}</p>
                  <p className={`text-[12px] font-semibold ${Math.abs(d) < 0.5 ? 'text-ink-3' : d > 0 ? 'text-danger' : 'text-ok'}`}>
                    {Math.abs(d) < 0.5 ? '=' : `${d > 0 ? '+' : ''}${d.toFixed(0)} %`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-[14px] font-bold">
          <span>Total gastos</span>
          <span>{eur(totalOut * mult)} · +{(((totalOut - prevOut) / prevOut) * 100).toFixed(1).replace('.', ',')} %</span>
        </div>
        <button type="button" className="mt-4 h-11 rounded-pill bg-grad px-4 text-[14px] font-bold text-white shadow-brand">+ Añadir gasto</button>
      </div>
    </div>
  );
}
