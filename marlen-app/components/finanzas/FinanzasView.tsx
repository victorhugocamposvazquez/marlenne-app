'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { updateAppointmentPayment } from '@/lib/agenda-write';
import { updatePackPayment } from '@/lib/pack-write';
import { avatarColor } from '@/lib/categories';
import {
  dayNumFromIso,
  dayNumFromYmd,
  dayOfMonthFromIso,
  monthIndexFromIso,
  movOwedCents,
  movPaid,
  yearFromIso,
  type FinanzasClient,
  type FinanzasMov,
} from '@/lib/finanzas';
import type { SalonEmisor } from '@/lib/salon-branding';
import { createClient } from '@/lib/supabase/client';
import { dayKey } from '@/lib/time';

const INK = '#0F0E1A';
const MUTED = '#6E6B7B';
const FAINT = '#9A97A8';
const LINE = '#ECEBF1';
const BG = '#F7F7FA';
const MAGENTA = '#d000a8';
const BLUE = '#0879ff';
const GRAD = 'linear-gradient(90deg,#ff2455,#d000a8,#0879ff)';
const GRAD135 = 'linear-gradient(135deg,#ff2455,#d000a8,#0879ff)';
const MONS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const eur = (cents: number) => {
  const n = cents / 100;
  return `${n.toLocaleString('es-ES', { minimumFractionDigits: cents % 100 ? 2 : 0 })} €`;
};

const TYPE_META = {
  cita: { name: 'Cita', bg: '#EDEBFF', c: '#5B4FD6' },
  bono: { name: 'Bono', bg: '#FDF0FA', c: '#B0088E' },
  fact: { name: 'Factura', bg: '#E8F2FF', c: '#0463D1' },
};

const FALLBACK_EMISOR: SalonEmisor = {
  marca: 'Tu centro',
  nombre: 'Datos fiscales pendientes',
  nif: 'NIF/CIF pendiente',
  dir: 'Completa Ajustes → Centro',
  tel: '',
  logoUrl: null,
};

type Gran = 'mes' | 'tri' | 'anio' | 'fechas';

type St = {
  gran: Gran;
  period: number;
  from: string;
  to: string;
  typeF: 'todo' | 'cita' | 'bono' | 'fact';
  movs: FinanzasMov[];
  wizard: boolean;
  step: 1 | 2 | 3;
  q: string;
  client: FinanzasClient | null;
  sel: Record<string, boolean>;
  sendVia: 'email' | 'wa' | 'link';
  fisOpen: boolean;
  fisNif: string;
  fisRazon: string;
  fisDir: string;
  preview: boolean;
  pvInv: FinanzasMov | null;
  narrow: boolean;
};

const chip = (on: boolean): React.CSSProperties => ({
  height: 36, padding: '0 15px', borderRadius: 99, cursor: 'pointer', fontSize: 13, fontWeight: 700,
  border: on ? `2px solid ${INK}` : `1.5px solid ${LINE}`, background: '#FFF', color: INK,
});
const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: MUTED };
const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 12, background: BG, border: 'none',
  padding: '0 13px', fontSize: 13.5, fontWeight: 600, outline: 'none', color: INK,
};

function periodsFor(g: Gran, year: number) {
  if (g === 'mes') return MONS.map((m, i) => ({ name: m.toUpperCase(), months: [i], year }));
  if (g === 'anio') {
    return [
      { name: String(year - 1), months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], year: year - 1 },
      { name: String(year), months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], year },
    ];
  }
  if (g === 'fechas') return [];
  return [0, 1, 2, 3].map(i => ({
    name: `T${i + 1}`,
    months: [i * 3, i * 3 + 1, i * 3 + 2],
    year,
  }));
}

function defaultState(movs: FinanzasMov[]): St {
  const today = dayKey(new Date());
  const now = new Date();
  const month = now.getMonth();
  const tri = Math.floor(month / 3);
  return {
    gran: 'tri',
    period: tri,
    from: `${now.getFullYear()}-${String(month + 1).padStart(2, '0')}-01`,
    to: today,
    typeF: 'todo',
    movs,
    wizard: false,
    step: 1,
    q: '',
    client: null,
    sel: {},
    sendVia: 'email',
    fisOpen: false,
    fisNif: '',
    fisRazon: '',
    fisDir: '',
    preview: false,
    pvInv: null,
    narrow: false,
  };
}

export default function FinanzasView({
  initialMovs,
  clients,
  emisor: emisorProp,
}: {
  initialMovs: FinanzasMov[];
  clients: FinanzasClient[];
  emisor?: SalonEmisor;
}) {
  const EMISOR = emisorProp ?? FALLBACK_EMISOR;
  const router = useRouter();
  const appToast = useToast();
  const [pendingPay, startPay] = useTransition();
  const [S, set] = useState<St>(() => defaultState(initialMovs));
  const go = (p: Partial<St>) => set(s => ({ ...s, ...p }));
  const yearNow = new Date().getFullYear();

  useEffect(() => {
    set(s => ({ ...s, movs: initialMovs }));
  }, [initialMovs]);

  useEffect(() => {
    const rs = () => set(s => ({ ...s, narrow: window.innerWidth < 1000 }));
    rs();
    window.addEventListener('resize', rs);
    return () => window.removeEventListener('resize', rs);
  }, []);

  const toast = (t: string) => appToast(t);

  const periods = periodsFor(S.gran, yearNow);
  const byDates = S.gran === 'fechas';
  const per = byDates
    ? { name: '', months: [] as number[], year: yearNow }
    : periods[Math.min(S.period, Math.max(0, periods.length - 1))] ?? { name: '', months: [], year: yearNow };

  const inRange = (x: FinanzasMov) => {
    if (x.kind === 'fact') {
      // facturas demo locales
      if (byDates) {
        const n = dayNumFromIso(x.at);
        return n >= dayNumFromYmd(S.from) && n <= dayNumFromYmd(S.to);
      }
      return yearFromIso(x.at) === per.year && per.months.includes(monthIndexFromIso(x.at));
    }
    if (byDates) {
      const n = dayNumFromIso(x.at);
      return n >= dayNumFromYmd(S.from) && n <= dayNumFromYmd(S.to);
    }
    return yearFromIso(x.at) === per.year && per.months.includes(monthIndexFromIso(x.at));
  };

  const allPeriod = useMemo(
    () => S.movs.filter(inRange).sort((a, b) => dayNumFromIso(b.at) - dayNumFromIso(a.at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [S.movs, S.gran, S.period, S.from, S.to],
  );
  const list = allPeriod.filter(x => S.typeF === 'todo' || x.kind === S.typeF);
  const sumCents = (a: FinanzasMov[]) => a.reduce((s, x) => s + x.amountCents, 0);
  const sumPaid = (a: FinanzasMov[]) => a.reduce((s, x) => s + Math.min(x.paidCents, x.amountCents || x.paidCents), 0);

  const paidMovs = allPeriod.filter(x => x.kind !== 'fact' && movPaid(x));
  const total = sumPaid(paidMovs);
  const base = total / 1.21;
  const iva = total - base;
  const pend = allPeriod.filter(x => x.kind !== 'fact' && !movPaid(x));
  const citasP = allPeriod.filter(x => x.kind === 'cita' && movPaid(x));
  const bonosP = allPeriod.filter(x => x.kind === 'bono' && movPaid(x));

  const fmtD = (s: string) => {
    const [, m, d] = s.split('-').map(Number);
    return `${d} ${MONS[m - 1]}`;
  };
  const periodLabel = byDates
    ? `${fmtD(S.from)} – ${fmtD(S.to)}`
    : S.gran === 'anio'
      ? per.name
      : `${per.name} ${per.year}`;

  let bars: { name: string; v: number }[];
  let barsTitle: string;
  if (S.gran === 'anio') {
    barsTitle = 'Por trimestre';
    bars = [0, 1, 2, 3].map(i => ({
      name: `T${i + 1}`,
      v: sumPaid(S.movs.filter(x =>
        x.kind !== 'fact'
        && yearFromIso(x.at) === per.year
        && Math.floor(monthIndexFromIso(x.at) / 3) === i
        && movPaid(x),
      )),
    }));
  } else if (byDates) {
    barsTitle = 'Por mes del rango';
    const months = [...new Set(list.filter(x => x.kind !== 'fact').map(x => monthIndexFromIso(x.at)))].sort((a, b) => a - b);
    bars = months.map(m => ({
      name: MONS[m].toUpperCase(),
      v: sumPaid(list.filter(x => x.kind !== 'fact' && monthIndexFromIso(x.at) === m && movPaid(x))),
    }));
  } else {
    barsTitle = 'Por mes';
    bars = per.months.map(m => ({
      name: MONS[m].toUpperCase(),
      v: sumPaid(S.movs.filter(x =>
        x.kind !== 'fact'
        && yearFromIso(x.at) === per.year
        && monthIndexFromIso(x.at) === m
        && movPaid(x),
      )),
    }));
  }
  const maxBar = Math.max(1, ...bars.map(b => b.v));

  const q = S.q.trim().toLowerCase();
  const matches = (q
    ? clients.filter(c => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q))
    : clients
  ).slice(0, 8);
  const billable = S.client
    ? S.movs
      .filter(x => x.clientId === S.client!.id && x.kind !== 'fact')
      .sort((a, b) => dayNumFromIso(b.at) - dayNumFromIso(a.at))
    : [];
  const selMovs = billable.filter(x => S.sel[x.id]);
  const sub = sumCents(selMovs);
  const factCount = S.movs.filter(x => x.kind === 'fact').length;
  const nextNum = `F-${yearNow}-${String(100 + factCount).padStart(3, '0')}`;
  const pv = S.pvInv;
  const pvNum = pv?.num ?? nextNum;
  const pvDate = pv
    ? `${dayOfMonthFromIso(pv.at)} ${MONS[monthIndexFromIso(pv.at)]} ${yearFromIso(pv.at)}`
    : new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const pvClient = pv
    ? pv.clientLabel
    : (S.fisOpen && S.fisRazon.trim() ? S.fisRazon.trim() : S.client?.name ?? '');
  const pvClientNif = pv ? (pv.nif ?? '') : (S.fisOpen && S.fisNif.trim() ? `NIF/CIF ${S.fisNif.trim()}` : '');
  const pvClientDir = pv ? (pv.dir ?? '') : (S.fisOpen ? S.fisDir.trim() : '');
  const pvLines = pv
    ? [{ name: pv.concept, base: pv.amountCents / 100 / 1.21, total: pv.amountCents / 100 }]
    : selMovs.map(c => ({
      name: `${c.concept} (${dayOfMonthFromIso(c.at)} ${MONS[monthIndexFromIso(c.at)]})`,
      base: c.amountCents / 100 / 1.21,
      total: c.amountCents / 100,
    }));
  const pvTotal = pv ? pv.amountCents / 100 : sub / 100;

  const togglePaid = (x: FinanzasMov) => {
    if (x.kind === 'fact' || pendingPay) return;
    const nextPaid = movPaid(x);
    startPay(async () => {
      const sb = createClient();
      if (nextPaid) {
        // marcar sin cobrar
        const r = x.kind === 'cita'
          ? await updateAppointmentPayment(sb, x.sourceId, { paidCents: 0, paymentMethod: null })
          : await updatePackPayment(sb, x.sourceId, { paidCents: 0, paymentMethod: null });
        if (!r.ok) {
          toast(r.error ?? 'No se ha podido actualizar el cobro');
          return;
        }
        set(s => ({
          ...s,
          movs: s.movs.map(m => m.id === x.id ? { ...m, paidCents: 0 } : m),
        }));
      } else {
        const amount = x.amountCents > 0 ? x.amountCents : Math.max(x.paidCents, 0);
        const r = x.kind === 'cita'
          ? await updateAppointmentPayment(sb, x.sourceId, { paidCents: amount || x.amountCents, paymentMethod: 'cash' })
          : await updatePackPayment(sb, x.sourceId, { paidCents: amount || x.amountCents, paymentMethod: 'cash' });
        if (!r.ok) {
          toast(r.error ?? 'No se ha podido actualizar el cobro');
          return;
        }
        const paid = amount || x.amountCents;
        set(s => ({
          ...s,
          movs: s.movs.map(m => m.id === x.id ? { ...m, paidCents: paid } : m),
        }));
      }
      router.refresh();
    });
  };

  const saveInvoice = () => {
    if (!S.client || !sub) return;
    const today = dayKey(new Date());
    const inv: FinanzasMov = {
      id: `fact:${Date.now()}`,
      kind: 'fact',
      sourceId: `local-${Date.now()}`,
      clientId: S.client.id,
      clientLabel: S.fisOpen && S.fisRazon.trim() ? S.fisRazon.trim() : S.client.name,
      concept: selMovs.map(c => c.concept).join(' + '),
      amountCents: sub,
      paidCents: sub,
      at: `${today}T12:00:00`,
      num: nextNum,
      nif: S.fisOpen && S.fisNif.trim() ? `NIF/CIF ${S.fisNif.trim()}` : '',
      dir: S.fisOpen ? S.fisDir.trim() : '',
    };
    // marcar cobrados en UI + persistir
    startPay(async () => {
      const sb = createClient();
      for (const c of selMovs) {
        if (movPaid(c)) continue;
        if (c.kind === 'cita') {
          await updateAppointmentPayment(sb, c.sourceId, {
            paidCents: c.amountCents,
            paymentMethod: 'cash',
          });
        } else if (c.kind === 'bono') {
          await updatePackPayment(sb, c.sourceId, {
            paidCents: c.amountCents,
            paymentMethod: 'cash',
          });
        }
      }
      set(s => ({
        ...s,
        movs: [
          inv,
          ...s.movs.map(m =>
            selMovs.some(c => c.id === m.id)
              ? { ...m, paidCents: Math.max(m.paidCents, m.amountCents) }
              : m,
          ),
        ],
        wizard: false,
      }));
      toast(
        S.sendVia === 'email'
          ? `Factura enviada por correo a ${S.client!.name.split(' ')[0]}`
          : S.sendVia === 'wa'
            ? `Factura enviada por WhatsApp a ${S.client!.name.split(' ')[0]}`
            : 'Factura guardada',
      );
      router.refresh();
    });
  };

  const openWizard = () => go({
    wizard: true, step: 1, q: '', client: null, sel: {}, sendVia: 'email',
    fisOpen: false, fisNif: '', fisRazon: '', fisDir: '',
  });
  const ini = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const wide = !S.narrow;

  const kpis = [
    { name: 'Ingresos cobrados', val: eur(total), delta: periodLabel, c: '#0FA958' },
    { name: 'Citas cobradas', val: eur(sumPaid(citasP)), delta: `${citasP.length} cita${citasP.length === 1 ? '' : 's'}`, c: FAINT },
    { name: 'Bonos vendidos', val: eur(sumPaid(bonosP)), delta: `${bonosP.length} bono${bonosP.length === 1 ? '' : 's'}`, c: FAINT },
    {
      name: 'Citas y bonos sin cobrar',
      val: eur(pend.reduce((s, x) => s + movOwedCents(x), 0)),
      delta: pend.length ? `${pend.length} sin marcar · revisa` : 'Todo al día',
      c: pend.length ? '#B3123B' : '#0FA958',
    },
  ];

  const InvoiceDoc = () => (
    <div style={{ minHeight: 0, background: '#FFF', borderRadius: 20, boxShadow: '0 30px 80px rgba(15,14,26,.4)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '0 0 auto', height: 6, background: GRAD }} />
      <div style={{ padding: wide ? '30px 34px' : '20px 20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: GRAD135, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: '0 0 auto' }}>
              {EMISOR.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={EMISOR.logoUrl} alt="" width={38} height={38} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width={22} height={22} viewBox="0 0 1024 1024"><path d="M198 693 L198 209 L350 209 L512 465 L674 209 L826 209 L826 693 L710 693 L710 393 L566 633 L458 633 L314 393 L314 693 Z" fill="#fff" /><path d="M300 789 Q512 945 724 789" fill="none" stroke="#fff" strokeWidth={48} strokeLinecap="round" /></svg>
              )}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.02em' }}>{EMISOR.marca}</span>
              <span style={{ fontSize: 10.5, color: MUTED }}>Centro de estética</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <span style={{ height: 24, padding: '0 10px', borderRadius: 99, background: INK, color: '#FFF', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center' }}>{pvNum}</span>
            <span style={{ fontSize: 10.5, color: MUTED }}>{pvDate}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, padding: '12px 14px', borderRadius: 14, background: BG }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: FAINT }}>EMISOR</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{EMISOR.nombre}</span>
            <span style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.5 }}>
              {EMISOR.nif} · {EMISOR.dir}{EMISOR.tel ? ` · ${EMISOR.tel}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: FAINT }}>CLIENTA</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{pvClient}</span>
            {pvClientNif && <span style={{ fontSize: 10.5, color: MUTED }}>{pvClientNif}</span>}
            {pvClientDir && <span style={{ fontSize: 10.5, color: MUTED }}>{pvClientDir}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8, padding: '7px 0', borderBottom: `2px solid ${INK}` }}>
            {['CONCEPTO', 'BASE', 'TOTAL'].map((h, i) => (
              <span key={h} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: FAINT, textAlign: i ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {pvLines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8, padding: '9px 0', borderBottom: `1px solid ${LINE}` }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{l.name}</span>
              <span style={{ fontSize: 12, textAlign: 'right', color: MUTED }}>{eur(Math.round(l.base * 100))}</span>
              <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{eur(Math.round(l.total * 100))}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, borderRadius: 14, background: INK, padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10.5, color: '#B7B4C4' }}>Base imponible</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#FFF' }}>{eur(Math.round(pvTotal / 1.21 * 100))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10.5, color: '#B7B4C4' }}>IVA 21 %</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#FFF' }}>{eur(Math.round((pvTotal - pvTotal / 1.21) * 100))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 7, borderTop: '1px solid rgba(255,255,255,.18)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>Total</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#FFF' }}>{eur(Math.round(pvTotal * 100))}</span>
            </div>
          </div>
        </div>
        <span style={{ fontSize: 9.5, color: FAINT, lineHeight: 1.6 }}>Pago al contado. IVA incluido al tipo vigente del 21 %. Gracias por confiar en {EMISOR.marca}.</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: 0, flex: 1, background: BG, fontFamily: 'Sora, sans-serif', color: INK, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div style={{ flex: '0 0 auto', padding: wide ? '22px 28px 0' : '18px 16px 0', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.03em' }}>Finanzas</h1>
          <span style={{ fontSize: 13.5, color: MUTED }}>Citas, bonos y facturas de tu centro</span>
        </div>
        <div style={{ display: 'flex', background: '#F2F2F7', borderRadius: 99, padding: 3 }}>
          {([['mes', 'Mes'], ['tri', 'Trimestre'], ['anio', 'Año'], ['fechas', 'Fechas']] as const).map(([k, name]) => (
            <button
              key={k}
              type="button"
              onClick={() => go({
                gran: k,
                period: k === 'mes' ? new Date().getMonth() : k === 'anio' ? 1 : Math.floor(new Date().getMonth() / 3),
              })}
              style={{ height: 36, padding: '0 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: S.gran === k ? INK : 'transparent', color: S.gran === k ? '#FFF' : MUTED }}
            >
              {name}
            </button>
          ))}
        </div>
        <button type="button" onClick={openWizard} style={{ height: 44, padding: '0 18px', borderRadius: 99, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: GRAD, color: '#FFF', fontSize: 14, fontWeight: 700, boxShadow: '0 8px 20px rgba(208,0,168,.25)' }}>
          + Nueva factura
        </button>
      </div>

      <div style={{ flex: '0 0 auto', padding: wide ? '12px 28px 0' : '10px 16px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {periods.map((p, i) => (
          <button key={`${p.name}-${p.year}`} type="button" onClick={() => go({ period: i })} style={{ ...chip(i === Math.min(S.period, periods.length - 1)) }}>
            {p.name}
          </button>
        ))}
        {byDates && (
          <>
            <input type="date" value={S.from} onChange={e => go({ from: e.target.value || S.from })} style={{ height: 36, border: `1.5px solid ${LINE}`, borderRadius: 99, background: '#FFF', padding: '0 13px', fontSize: 13, fontWeight: 600, color: INK, outline: 'none' }} />
            <span style={{ fontSize: 13, color: FAINT }}>→</span>
            <input type="date" value={S.to} onChange={e => go({ to: e.target.value || S.to })} style={{ height: 36, border: `1.5px solid ${LINE}`, borderRadius: 99, background: '#FFF', padding: '0 13px', fontSize: 13, fontWeight: 600, color: INK, outline: 'none' }} />
            {[
              ['Hoy', dayKey(new Date()), dayKey(new Date())],
              ['Últimos 7 días', dayKey(new Date(Date.now() - 6 * 864e5)), dayKey(new Date())],
              ['Últimos 30 días', dayKey(new Date(Date.now() - 29 * 864e5)), dayKey(new Date())],
            ].map(([name, f, t]) => (
              <button key={name} type="button" onClick={() => go({ from: f, to: t })} style={{ height: 32, padding: '0 12px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: '1.5px dashed #C4C2CF', background: 'none', color: MUTED }}>
                {name}
              </button>
            ))}
          </>
        )}
        <span style={{ fontSize: 12.5, color: FAINT }}>{list.length} movimientos en el periodo</span>
      </div>

      <div style={{ flex: '0 0 auto', padding: wide ? '14px 28px 0' : '12px 16px 0', display: 'grid', gridTemplateColumns: wide ? 'repeat(4,1fr)' : 'repeat(2,1fr)', gap: 12 }}>
        {kpis.map(k => (
          <div key={k.name} style={{ background: '#FFF', border: `1px solid ${LINE}`, borderRadius: 18, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>{k.name}</span>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>{k.val}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: k.c }}>{k.delta}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: wide ? 'row' : 'column', gap: 16, padding: wide ? '16px 28px 28px' : '12px 16px 24px' }}>
        <div style={{ flex: 1, minWidth: 0, background: '#FFF', border: `1px solid ${LINE}`, borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: wide ? 'none' : 480 }}>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px 0', flexWrap: 'wrap' }}>
            {([['todo', 'Todo'], ['cita', 'Citas'], ['bono', 'Bonos'], ['fact', 'Facturas']] as const).map(([k, name]) => (
              <button key={k} type="button" onClick={() => go({ typeF: k })} style={{ height: 32, padding: '0 13px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: S.typeF === k ? `2px solid ${INK}` : `1.5px solid ${LINE}`, background: '#FFF', color: INK }}>
                {name}
              </button>
            ))}
          </div>
          {S.typeF === 'fact' && (
            <button type="button" onClick={openWizard} style={{ margin: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 14, cursor: 'pointer', fontSize: 13, fontWeight: 700, border: '1.5px dashed #C4C2CF', background: 'none', color: MUTED }}>
              + Nueva factura
            </button>
          )}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 10 }}>
            {list.map(x => {
              const paid = movPaid(x);
              const isF = x.kind === 'fact';
              const tm = TYPE_META[x.kind];
              const m = monthIndexFromIso(x.at);
              const d = dayOfMonthFromIso(x.at);
              return (
                <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderTop: '1px solid #F2F2F7' }}>
                  <span style={{ flex: '0 0 76px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span style={{ height: 20, padding: '0 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', background: tm.bg, color: tm.c }}>{tm.name}</span>
                    <span style={{ fontSize: 11, color: FAINT }}>{d} {MONS[m]}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.clientLabel}</span>
                    <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isF && x.num ? `${x.num} · ` : ''}{x.concept}</span>
                  </span>
                  <span style={{ flex: '0 0 auto', fontSize: 13.5, fontWeight: 700 }}>{eur(x.amountCents)}</span>
                  <button
                    type="button"
                    disabled={isF || pendingPay}
                    onClick={() => togglePaid(x)}
                    style={{ flex: '0 0 auto', height: 26, padding: '0 10px', borderRadius: 99, border: 'none', cursor: isF ? 'default' : 'pointer', fontSize: 11, fontWeight: 700, background: isF ? '#E8F2FF' : paid ? '#E7F7EE' : '#FFF1F4', color: isF ? '#0463D1' : paid ? '#0FA958' : '#B3123B' }}
                  >
                    {isF ? 'Emitida' : paid ? 'Cobrada' : 'Sin cobrar'}
                  </button>
                  <span style={{ flex: '0 0 auto', display: 'flex', gap: 6 }}>
                    {isF && (
                      <button type="button" onClick={() => go({ preview: true, pvInv: x })} title="Ver factura" style={{ width: 30, height: 30, borderRadius: 99, border: `1.5px solid ${LINE}`, background: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.8" /></svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toast(isF ? `Factura ${x.num} reenviada a ${x.clientLabel.split(' ')[0]}` : `Recordatorio de pago enviado a ${x.clientLabel.split(' ')[0]}`)}
                      title="Enviar"
                      style={{ width: 30, height: 30, borderRadius: 99, border: `1.5px solid ${LINE}`, background: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
                    </button>
                  </span>
                </div>
              );
            })}
            {!list.length && <span style={{ display: 'block', padding: '18px 20px', fontSize: 13.5, color: MUTED }}>Sin movimientos en este periodo.</span>}
          </div>
        </div>

        <div style={{ flex: wide ? '0 0 340px' : '1 1 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!S.wizard ? (
            <>
              <div style={{ background: '#FFF', border: `1px solid ${LINE}`, borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>Resumen · {periodLabel}</span>
                {pend.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 13, background: '#FFF1F4', border: '1px solid #FBD5DE' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#B3123B' }}>
                      {pend.length} cita{pend.length === 1 ? '' : 's'}/bono{pend.length === 1 ? '' : 's'} sin marcar cobro · {eur(pend.reduce((s, x) => s + movOwedCents(x), 0))}
                    </span>
                  </div>
                )}
                <div style={{ borderRadius: 14, background: BG, padding: '4px 14px', display: 'flex', flexDirection: 'column' }}>
                  {[
                    ['Citas cobradas', `${citasP.length}`, eur(sumPaid(citasP))],
                    ['Bonos vendidos', `${bonosP.length}`, eur(sumPaid(bonosP))],
                    ['Facturas emitidas', `${allPeriod.filter(x => x.kind === 'fact').length}`, eur(sumCents(allPeriod.filter(x => x.kind === 'fact')))],
                  ].map(([n, c, v]) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #E6E5EC' }}>
                      <span style={{ flex: 1, fontSize: 13, color: MUTED }}>{n}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: FAINT }}>{c}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E6E5EC' }}>
                    <span style={{ fontSize: 13, color: MUTED }}>Base imponible</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{eur(Math.round(base))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E6E5EC' }}>
                    <span style={{ fontSize: 13, color: MUTED }}>IVA 21 %</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{eur(Math.round(iva))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Total cobrado</span>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{eur(total)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => toast(`PDF del periodo ${periodLabel} descargado`)} style={{ flex: 1, height: 42, borderRadius: 99, border: `2px solid ${INK}`, background: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Descargar PDF</button>
                  <button type="button" onClick={() => toast(`Resumen ${periodLabel} enviado a tu gestoría`)} style={{ flex: 1, height: 42, borderRadius: 99, border: `1.5px solid ${LINE}`, background: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Enviar a gestoría</button>
                </div>
              </div>
              <div style={{ background: '#FFF', border: `1px solid ${LINE}`, borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>{barsTitle}</span>
                {bars.map(b => (
                  <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: '0 0 36px', fontSize: 12, fontWeight: 700, color: MUTED }}>{b.name}</span>
                    <div style={{ flex: 1, height: 12, borderRadius: 99, background: '#F2F2F7', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: GRAD, width: `${Math.round(b.v / maxBar * 100)}%` }} />
                    </div>
                    <span style={{ flex: '0 0 66px', textAlign: 'right', fontSize: 12.5, fontWeight: 700 }}>{eur(b.v)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, background: '#FFF', border: `1px solid ${LINE}`, borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 420 }}>
              <div style={{ flex: '0 0 auto', height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${LINE}` }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11.5, color: FAINT }}>Nueva factura · paso {S.step} de 3</span>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{S.step === 1 ? '¿Para quién?' : S.step === 2 ? '¿Qué le facturas?' : 'Revisar y enviar'}</span>
                </div>
                <button type="button" onClick={() => go({ wizard: false })} style={{ width: 34, height: 34, borderRadius: 99, border: 'none', background: '#F2F2F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <div style={{ flex: '0 0 auto', margin: '12px 16px 0', display: 'flex', gap: 5 }}>
                {[1, 2, 3].map(i => <span key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: S.step >= i ? MAGENTA : LINE }} />)}
              </div>
              {S.step === 1 && (
                <>
                  <div style={{ flex: '0 0 auto', margin: '12px 16px 0' }}>
                    <input value={S.q} onChange={e => go({ q: e.target.value })} placeholder="Nombre o teléfono" autoFocus style={inp} />
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 14px' }}>
                    {matches.map(c => (
                      <button key={c.id} type="button" onClick={() => go({ client: c, sel: {}, step: 2 })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', border: 'none', borderBottom: `1px solid ${LINE}`, background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                        <span style={{ width: 32, height: 32, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFF', flex: '0 0 auto', background: avatarColor(c.name) }}>{ini(c.name)}</span>
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</span>
                          <span style={{ fontSize: 11.5, color: MUTED }}>{c.phone || 'Sin teléfono'}</span>
                        </span>
                      </button>
                    ))}
                    {!matches.length && <span style={{ fontSize: 12.5, color: MUTED }}>No hay clientas con ese nombre.</span>}
                  </div>
                </>
              )}
              {S.step === 2 && (
                <>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <span style={{ fontSize: 12.5, color: MUTED }}>Citas y bonos de <b>{S.client?.name}</b> — marca lo que entra en la factura:</span>
                    {!billable.length && <span style={{ fontSize: 12.5, color: FAINT }}>No tiene citas ni bonos en el historial cargado.</span>}
                    {billable.map(c => {
                      const on = !!S.sel[c.id];
                      const paid = movPaid(c);
                      return (
                        <button key={c.id} type="button" onClick={() => go({ sel: { ...S.sel, [c.id]: !on } })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 13, textAlign: 'left', cursor: 'pointer', border: on ? `1.5px solid ${INK}` : `1.5px solid ${LINE}`, background: on ? '#FFF' : BG }}>
                          <span style={{ width: 20, height: 20, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', background: on ? INK : '#FFF', border: on ? 'none' : '1.5px solid #C4C2CF' }}>
                            {on && <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 12.5 10 18 20 6.5" /></svg>}
                          </span>
                          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.concept} · {dayOfMonthFromIso(c.at)} {MONS[monthIndexFromIso(c.at)]}</span>
                            {!paid && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#B3123B' }}>Sin cobrar · se marcará cobrada al facturar</span>}
                          </span>
                          <span style={{ flex: '0 0 auto', fontSize: 13, fontWeight: 700 }}>{eur(c.amountCents)}</span>
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => toast('Concepto libre: próximamente')} style={{ height: 40, borderRadius: 99, border: '1.5px dashed #C4C2CF', background: 'none', fontSize: 12.5, fontWeight: 700, color: MUTED, cursor: 'pointer' }}>+ Concepto libre</button>
                  </div>
                  <div style={{ flex: '0 0 auto', padding: '0 16px 16px' }}>
                    <button type="button" onClick={() => { if (sub) go({ step: 3 }); }} style={{ width: '100%', height: 46, borderRadius: 99, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#FFF', background: INK, opacity: sub ? 1 : 0.4 }}>
                      Seguir · {eur(sub)}
                    </button>
                  </div>
                </>
              )}
              {S.step === 3 && (
                <>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ borderRadius: 14, background: BG, padding: '4px 14px', display: 'flex', flexDirection: 'column' }}>
                      {[
                        ['Para', pvClient],
                        ['Base', eur(Math.round(sub / 1.21))],
                        ['IVA 21 %', eur(Math.round(sub - sub / 1.21))],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E6E5EC' }}>
                          <span style={{ fontSize: 12.5, color: MUTED }}>{k}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{eur(sub)}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => go({ fisOpen: !S.fisOpen })} style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: BLUE, cursor: 'pointer' }}>
                      {S.fisOpen ? 'Quitar datos fiscales' : 'Añadir datos fiscales (particular, autónomo o empresa)'}
                    </button>
                    {S.fisOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input value={S.fisRazon} onChange={e => go({ fisRazon: e.target.value })} placeholder="Nombre completo o razón social" style={inp} />
                        <input value={S.fisNif} onChange={e => go({ fisNif: e.target.value })} placeholder="NIF / DNI / CIF" style={inp} />
                        <input value={S.fisDir} onChange={e => go({ fisDir: e.target.value })} placeholder="Dirección fiscal (opcional si es particular)" style={inp} />
                      </div>
                    )}
                    <span style={label}>¿Cómo se la mandamos?</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {([['email', 'Correo'], ['wa', 'WhatsApp'], ['link', 'Solo guardar']] as const).map(([k, name]) => (
                        <button key={k} type="button" onClick={() => go({ sendVia: k })} style={{ flex: 1, height: 42, borderRadius: 99, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, border: S.sendVia === k ? `2px solid ${INK}` : `1.5px solid ${LINE}`, background: S.sendVia === k ? BG : '#FFF', color: INK }}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: '0 0 auto', padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button type="button" onClick={() => go({ preview: true, pvInv: null })} style={{ width: '100%', height: 44, borderRadius: 99, border: `2px solid ${INK}`, background: '#FFF', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                      Previsualizar factura
                    </button>
                    <button type="button" onClick={saveInvoice} disabled={pendingPay} style={{ width: '100%', height: 48, borderRadius: 99, border: 'none', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', color: '#FFF', background: GRAD, boxShadow: '0 8px 20px rgba(208,0,168,.25)', opacity: pendingPay ? 0.7 : 1 }}>
                      {S.sendVia === 'email' ? 'Guardar y enviar por correo' : S.sendVia === 'wa' ? 'Guardar y enviar por WhatsApp' : 'Guardar factura'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {S.preview && (
        <>
          <div onClick={() => go({ preview: false, pvInv: null })} style={{ position: 'fixed', inset: 0, background: 'rgba(15,14,26,.5)', zIndex: 50 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 51, width: 'min(520px,94vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>Así la verá tu client@</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => toast('PDF de la factura descargado')} style={{ height: 36, padding: '0 14px', borderRadius: 99, border: 'none', background: 'rgba(255,255,255,.15)', color: '#FFF', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Descargar PDF</button>
                <button type="button" onClick={() => go({ preview: false, pvInv: null })} style={{ width: 36, height: 36, borderRadius: 99, border: 'none', background: 'rgba(255,255,255,.15)', color: '#FFF', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            <InvoiceDoc />
          </div>
        </>
      )}
    </div>
  );
}
