'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import {
  currentPeriodKey,
  periodKeyFromParts,
  periodRange,
  vendorLabel,
  type VendorConnection,
  type VendorInvoice,
  type VendorKind,
} from '@/lib/vendor-invoices';

const INK = '#0F0E1A';
const MUTED = '#6E6B7B';
const FAINT = '#9A97A8';
const LINE = '#ECEBF1';
const BG = '#F7F7FA';

type Props = {
  initialPeriodKey?: string;
  connections: VendorConnection[];
  invoices: VendorInvoice[];
  gestoriaWhatsapp: string | null;
  amazonConfigured: boolean;
  metaConfigured: boolean;
};

function yearQuarter(periodKey: string): { year: number; q: 1 | 2 | 3 | 4 } {
  const m = /^(\d{4})-T([1-4])$/.exec(periodKey);
  if (!m) {
    const now = new Date();
    return { year: now.getFullYear(), q: (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4 };
  }
  return { year: Number(m[1]), q: Number(m[2]) as 1 | 2 | 3 | 4 };
}

export default function VendorInvoicesTools({
  initialPeriodKey,
  connections: initialConnections,
  invoices: initialInvoices,
  gestoriaWhatsapp,
  amazonConfigured,
  metaConfigured,
}: Props) {
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [periodKey, setPeriodKey] = useState(initialPeriodKey || currentPeriodKey());
  const [connections, setConnections] = useState(initialConnections);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [vendors, setVendors] = useState<{ amazon: boolean; meta: boolean }>({
    amazon: true,
    meta: true,
  });
  const [uploadVendor, setUploadVendor] = useState<VendorKind>('amazon_business');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setConnections(initialConnections);
  }, [initialConnections]);

  useEffect(() => {
    if (initialPeriodKey) setPeriodKey(initialPeriodKey);
  }, [initialPeriodKey]);

  useEffect(() => {
    setInvoices(initialInvoices.filter(i => i.periodKey === periodKey));
  }, [initialInvoices, periodKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const ok = sp.get('vendor_ok');
    const err = sp.get('vendor_err');
    if (ok) {
      toast(ok === 'amazon' ? 'Amazon Business conectado' : 'Meta Business conectado');
      router.replace('/finanzas');
      router.refresh();
    } else if (err) {
      toast(decodeURIComponent(err));
      router.replace('/finanzas');
    }
  }, [router, toast]);

  const { year, q } = yearQuarter(periodKey);
  const { label } = useMemo(() => periodRange(periodKey), [periodKey]);

  const selectedVendors = useMemo(() => {
    const list: VendorKind[] = [];
    if (vendors.amazon) list.push('amazon_business');
    if (vendors.meta) list.push('meta');
    list.push('manual');
    return list;
  }, [vendors]);

  const connOf = (v: 'amazon_business' | 'meta') =>
    connections.find(c => c.vendor === v);

  const setQuarter = (nextQ: 1 | 2 | 3 | 4) => {
    setPeriodKey(periodKeyFromParts(year, nextQ));
  };
  const setYear = (y: number) => {
    setPeriodKey(periodKeyFromParts(y, q));
  };

  const connect = (vendor: 'amazon_business' | 'meta') => {
    window.location.href = `/api/finanzas/vendor-invoices/connect?vendor=${vendor}`;
  };

  const disconnect = (vendor: 'amazon_business' | 'meta') => {
    setBusy(`disc-${vendor}`);
    startTransition(async () => {
      const res = await fetch(
        `/api/finanzas/vendor-invoices/connect?vendor=${vendor}`,
        { method: 'DELETE' },
      );
      setBusy(null);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(j.error || 'No se pudo desconectar');
        return;
      }
      toast(vendor === 'amazon_business' ? 'Amazon desconectado' : 'Meta desconectado');
      router.refresh();
    });
  };

  const sync = () => {
    const syncVendors = [
      vendors.amazon ? 'amazon_business' : null,
      vendors.meta ? 'meta' : null,
    ].filter(Boolean) as string[];
    if (!syncVendors.length) {
      toast('Marca Amazon y/o Meta para sincronizar');
      return;
    }
    setBusy('sync');
    startTransition(async () => {
      const res = await fetch('/api/finanzas/vendor-invoices/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodKey, vendors: syncVendors }),
      });
      const j = await res.json().catch(() => ({}));
      setBusy(null);
      if (!res.ok) {
        toast(j.error || 'Error al sincronizar');
        return;
      }
      const parts: string[] = [];
      for (const [k, v] of Object.entries(j.results || {})) {
        const r = v as { imported?: number; error?: string };
        if (r.error) parts.push(`${k}: ${r.error}`);
        else parts.push(`${k}: ${r.imported ?? 0} nuevas`);
      }
      toast(parts.join(' · ') || 'Sincronizado');
      router.refresh();
    });
  };

  const downloadZip = async () => {
    setBusy('zip');
    try {
      const qs = new URLSearchParams({
        period: periodKey,
        vendors: selectedVendors.join(','),
      });
      const res = await fetch(`/api/finanzas/vendor-invoices/zip?${qs}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(j.error || 'No se pudo generar el ZIP');
        return null;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = /filename="([^"]+)"/.exec(cd);
      const filename = m?.[1] || `facturas-${periodKey}.zip`;
      return { blob, filename };
    } finally {
      setBusy(null);
    }
  };

  const onDownload = () => {
    startTransition(async () => {
      const packed = await downloadZip();
      if (!packed) return;
      const url = URL.createObjectURL(packed.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = packed.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast('ZIP descargado');
    });
  };

  const onShareWa = () => {
    startTransition(async () => {
      const packed = await downloadZip();
      if (!packed) return;
      const file = new File([packed.blob], packed.filename, { type: 'application/zip' });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: `Facturas ${label}`,
            text: gestoriaWhatsapp
              ? `Facturas proveedores ${label}`
              : `Facturas proveedores ${label}`,
          });
          toast('Compartido');
          return;
        } catch {
          /* cancelado o falló */
        }
      }
      const url = URL.createObjectURL(packed.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = packed.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast('ZIP descargado — adjúntalo en WhatsApp');
      if (gestoriaWhatsapp) {
        const phone = gestoriaWhatsapp.replace(/\D/g, '');
        if (phone) {
          window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
        }
      }
    });
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      toast('Solo PDF');
      return;
    }
    setBusy('upload');
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('vendor', uploadVendor);
      fd.set('title', file.name.replace(/\.pdf$/i, ''));
      fd.set('issuedAt', new Date().toISOString().slice(0, 10));
      const res = await fetch('/api/finanzas/vendor-invoices/upload', {
        method: 'POST',
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(j.error || 'No se pudo subir');
        return;
      }
      toast('PDF subido');
      if (j.periodKey) setPeriodKey(j.periodKey);
      router.refresh();
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const amazon = connOf('amazon_business');
  const meta = connOf('meta');
  const disabled = Boolean(busy) || pending;

  const btn = (primary?: boolean): React.CSSProperties => ({
    height: 40,
    padding: '0 14px',
    borderRadius: 99,
    border: primary ? 'none' : `1.5px solid ${LINE}`,
    background: primary ? INK : '#FFF',
    color: primary ? '#FFF' : INK,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  });

  return (
    <div
      style={{
        background: '#FFF',
        border: `1px solid ${LINE}`,
        borderRadius: 18,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div>
        <span style={{ fontSize: 15.5, fontWeight: 700 }}>Herramientas</span>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: MUTED, lineHeight: 1.4 }}>
          Facturas Amazon Business y Meta por trimestre · descarga ZIP o WhatsApp
        </p>
      </div>

      {/* Conexiones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {([
          {
            key: 'amazon_business' as const,
            name: 'Amazon Business',
            conn: amazon,
            configured: amazonConfigured,
          },
          {
            key: 'meta' as const,
            name: 'Meta Business',
            conn: meta,
            configured: metaConfigured,
          },
        ]).map(row => (
          <div
            key={row.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: BG,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{row.name}</span>
              <span style={{ fontSize: 11.5, color: FAINT }}>
                {row.conn?.status === 'connected'
                  ? `Conectado${row.conn.externalAccountId ? ` · ${row.conn.externalAccountId}` : ''}`
                  : row.conn?.status === 'error'
                    ? (row.conn.lastError || 'Error')
                    : row.configured
                      ? 'Sin conectar'
                      : 'API no configurada en servidor'}
              </span>
            </div>
            {row.conn?.status === 'connected' ? (
              <button type="button" disabled={disabled} onClick={() => disconnect(row.key)} style={btn()}>
                Desconectar
              </button>
            ) : (
              <button
                type="button"
                disabled={disabled || !row.configured}
                onClick={() => connect(row.key)}
                style={btn(true)}
                title={!row.configured ? 'Faltan claves en el servidor' : undefined}
              >
                Conectar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Trimestre */}
      <div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: MUTED }}>Trimestre</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <select
            value={year}
            disabled={disabled}
            onChange={e => setYear(Number(e.target.value))}
            style={{
              height: 36,
              borderRadius: 10,
              border: `1.5px solid ${LINE}`,
              padding: '0 10px',
              fontSize: 13,
              fontWeight: 700,
              background: '#FFF',
            }}
          >
            {[year - 1, year, year + 1].filter((y, i, a) => a.indexOf(y) === i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {([1, 2, 3, 4] as const).map(n => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => setQuarter(n)}
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 99,
                border: n === q ? `2px solid ${INK}` : `1.5px solid ${LINE}`,
                background: '#FFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              T{n}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={vendors.amazon}
            onChange={e => setVendors(v => ({ ...v, amazon: e.target.checked }))}
          />
          Amazon
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={vendors.meta}
            onChange={e => setVendors(v => ({ ...v, meta: e.target.checked }))}
          />
          Meta
        </label>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" disabled={disabled} onClick={sync} style={btn(true)}>
          {busy === 'sync' ? 'Sincronizando…' : 'Sincronizar'}
        </button>
        <button type="button" disabled={disabled} onClick={onDownload} style={btn()}>
          Descargar ZIP
        </button>
        <button type="button" disabled={disabled} onClick={onShareWa} style={btn()}>
          Compartir por WhatsApp
        </button>
      </div>

      {/* Subida manual */}
      <div
        style={{
          borderTop: `1px solid ${LINE}`,
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 600, color: MUTED }}>
          Subir PDF manual ({label})
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <select
            value={uploadVendor}
            disabled={disabled}
            onChange={e => setUploadVendor(e.target.value as VendorKind)}
            style={{
              height: 36,
              borderRadius: 10,
              border: `1.5px solid ${LINE}`,
              padding: '0 10px',
              fontSize: 12.5,
              fontWeight: 600,
              background: '#FFF',
            }}
          >
            <option value="amazon_business">Amazon</option>
            <option value="meta">Meta</option>
            <option value="manual">Otro</option>
          </select>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            style={btn()}
          >
            {busy === 'upload' ? 'Subiendo…' : 'Elegir PDF'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            style={{ display: 'none' }}
            onChange={e => void onUpload(e.target.files?.[0])}
          />
        </div>
      </div>

      {/* Lista */}
      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: MUTED }}>
          Facturas {label} ({invoices.length})
        </span>
        {!invoices.length ? (
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: FAINT }}>
            Aún no hay facturas. Sincroniza o sube un PDF.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {invoices.slice(0, 12).map(inv => (
              <li
                key={inv.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 12.5,
                  padding: '6px 0',
                  borderBottom: `1px solid ${LINE}`,
                }}
              >
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inv.title}
                </span>
                <span style={{ flexShrink: 0, color: FAINT }}>
                  {inv.issuedAt} · {vendorLabel(inv.vendor)}
                </span>
              </li>
            ))}
            {invoices.length > 12 && (
              <li style={{ fontSize: 11.5, color: FAINT }}>+{invoices.length - 12} más</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
