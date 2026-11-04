'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import css from './marketing.module.css';
import Creative, { CreativeCanvas } from './Creative';
import { Icon, MarlenAvatar, PATH } from './Icons';
import { searchStockByTheme } from '@/app/actions/marketing-stock';
import { ALT, ELEMENTS, FORMATS, FORMAT_H, IMAGES, REC, SEAL_TEXT, STYLES, STYLE_TONE, THEMES, TONES, fieldsFor, getCatalog, getType, recommendElements, setActiveCatalog, suggestTheme } from '@/lib/marketing/data';
import { LIMITS, type TextField, improveAll, pickLine, withClientVars } from '@/lib/marketing/copy';
import { copyBlob, copyText, downloadBlob, nodeToPng, shareBlob, slug } from '@/lib/marketing/export';
import { stockProxyPath } from '@/lib/marketing/stock';
import type { BankImage, CreativeConfig, CreativeType, ElementKey, Elements, Fields, FormatId, LibraryItem, StyleId, TabId, Tone, TypeId } from '@/lib/marketing/types';
import type { ClientOption, ServiceOption } from '@/lib/types';
import {
  createClientQuick,
  createPackTemplateQuick,
  sellPackFromMarketing,
} from '@/app/actions/marketing-catalog';

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
const TABS: TabId[] = ['imagen', 'texto', 'estilo', 'elementos'];
const TAB_LABEL: Record<TabId, string> = { imagen: 'Imagen', texto: 'Texto', estilo: 'Estilo', elementos: 'Elementos' };
const STORAGE_KEY = 'marlen.marketing.library.v1';
const TYPES_WITH_CLIENT: TypeId[] = ['bono', 'regalo'];
const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;

function useIsMobile(bp = 768) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const f = () => setM(q.matches);
    f();
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, [bp]);
  return m;
}

function useElementSize<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size] as const;
}

interface EditorState {
  editingId: string | null; type: TypeId; catIdx: number; style: StyleId; format: FormatId; fields: Fields; showLogo: boolean;
  image: string | null; imgTheme: string; els: Elements; elsManual: boolean; tone: Tone; toneManual: boolean; tab: TabId; safe: boolean;
  packTemplateId: string | null; clientId: string | null; clientName: string | null; fieldsManual: boolean;
}
interface ModalState {
  step: 'type' | 'item' | 'client';
  type: TypeId;
  fromEditor: boolean;
  pendingIdx?: number;
  pendingClientId?: string | null;
  pendingClientName?: string | null;
}
interface DoneState { id: string; mode: 'png' | 'share'; extra: FormatId[]; sellPack?: boolean; sold?: boolean }
interface ToastState { msg: string; action?: { label: string; fn: () => void } }

function makeEditor(o: Partial<EditorState> & { type: TypeId; style: StyleId }): EditorState {
  const catIdx = o.catIdx ?? 0;
  return {
    editingId: null, catIdx, format: 'story', fields: fieldsFor(o.type, catIdx), showLogo: true, image: null,
    imgTheme: suggestTheme(o.type, catIdx), els: recommendElements(o.style, o.type), elsManual: false,
    tone: STYLE_TONE[o.style], toneManual: false, tab: 'imagen', safe: false,
    packTemplateId: null, clientId: null, clientName: null, fieldsManual: false, ...o,
  };
}

export interface MarketingStudioProps {
  salon?: string;
  logo?: string;
  brandColor?: string;
  bookingLink?: string;
  catalog?: CreativeType[];
  clients?: ClientOption[];
  services?: ServiceOption[];
  onBack?: () => void;
}

export default function MarketingStudio({
  salon = 'Tu centro',
  logo,
  brandColor = '#D000A8',
  bookingLink = '',
  catalog,
  clients: clientsProp = [],
  services: servicesProp = [],
  onBack,
}: MarketingStudioProps) {
  const mobile = useIsMobile();
  const [types, setTypes] = useState(() => (catalog?.length ? catalog : getCatalog()));
  useEffect(() => {
    if (catalog?.length) {
      setActiveCatalog(catalog);
      setTypes(catalog);
    }
  }, [catalog]);
  const [clients, setClients] = useState<ClientOption[]>(clientsProp);
  useEffect(() => { setClients(clientsProp); }, [clientsProp]);
  const [view, setView] = useState<'home' | 'editor'>('home');
  const [ed, setEd] = useState<EditorState>(() => makeEditor({ type: 'reserva', style: 'card' }));
  const patch = useCallback((p: Partial<EditorState> | ((e: EditorState) => Partial<EditorState>)) => setEd((e) => ({ ...e, ...(typeof p === 'function' ? p(e) : p) })), []);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [done, setDone] = useState<DoneState | null>(null);
  const [clientQ, setClientQ] = useState('');
  const [newPackOpen, setNewPackOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [packForm, setPackForm] = useState({ name: '', sessions: '5', price: '', serviceId: '' });
  const [clientForm, setClientForm] = useState({ fullName: '', phone: '' });
  const [formBusy, setFormBusy] = useState(false);
  const [sellBusy, setSellBusy] = useState(false);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [uploads, setUploads] = useState<BankImage[]>([]);
  const [stockByTheme, setStockByTheme] = useState<Record<string, BankImage[]>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [stockHint, setStockHint] = useState<string | null>(null);
  const [stockQueryIdx, setStockQueryIdx] = useState(0);
  const [filter, setFilter] = useState<'all' | FormatId>('all');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(bookingLink);
  useEffect(() => {
    setLink(bookingLink);
  }, [bookingLink]);
  const [exportCfg, setExportCfg] = useState<CreativeConfig | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const exportResolve = useRef<(() => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoN = useRef(0);
  const [previewRef, preview] = useElementSize<HTMLDivElement>();

  // TODO(backend): sustituir localStorage por la API de biblioteca del centro.
  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setLibrary(JSON.parse(raw)); } catch { /* noop */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(library)); } catch { /* noop */ }
  }, [library]);

  const showToast = useCallback((msg: string, action?: ToastState['action']) => {
    setToast({ msg, action });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setToast(null); setHighlight(null); }, action ? 6000 : 3800);
  }, []);

  /* Pixabay por temática (pestaña Imagen) */
  useEffect(() => {
    const theme = ed.imgTheme;
    if (view !== 'editor' || !theme || theme === 'mias') return;
    let cancelled = false;
    setStockLoading(true);
    setStockHint(null);
    void searchStockByTheme({ theme, format: ed.format, queryIndex: stockQueryIdx }).then(r => {
      if (cancelled) return;
      setStockLoading(false);
      if (!r.ok) {
        setStockHint(r.error);
        return;
      }
      if (!r.configured) {
        setStockHint(r.hint);
        setStockByTheme(s => ({ ...s, [theme]: [] }));
        return;
      }
      const images: BankImage[] = r.photos.map(p => ({
        id: `px-${theme}-${p.id}`,
        theme,
        label: p.alt || p.photographer,
        bg: '#E4E3EA',
        src: stockProxyPath(p.srcUrl),
      }));
      setStockByTheme(s => ({ ...s, [theme]: images }));
      setEd(e => {
        if (e.imgTheme !== theme) return e;
        const cur = e.image;
        if (cur && images.some(x => x.id === cur)) return e;
        if (!cur || /^[a-z]+-\d+$/.test(cur)) {
          return { ...e, image: images[0]?.id ?? null };
        }
        return e;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ed.imgTheme, ed.format, stockQueryIdx, view]);

  /* ---------- datos derivados ---------- */
  const T = getType(ed.type);
  const rawItem = T.items[ed.catIdx] || T.items[0];
  const item = withClientVars(rawItem, ed.clientName);
  const F = FORMATS.find((f) => f.id === ed.format) || FORMATS[0];
  const allStock = Object.values(stockByTheme).flat();
  const imgObj = (id: string | null) =>
    id
      ? uploads.find(u => u.id === id) || allStock.find(u => u.id === id) || IMAGES[id] || null
      : null;
  const themeLabel = (id: string) => (id === 'mias' ? 'Tus fotos' : THEMES.find((t) => t.id === id)?.label || '');
  const cfgOf = (o: { style: StyleId; format: FormatId; fields: Fields; showLogo: boolean; image: string | null; els: Elements }): CreativeConfig => {
    const im = imgObj(o.image);
    return { ...o.fields, style: o.style, format: o.format, accent: brandColor, logo, showLogo: o.showLogo, link, image: im ? { bg: im.bg, src: im.src, label: im.label } : null, elements: o.els };
  };
  const currentCfg = cfgOf(ed);
  const sugTheme = suggestTheme(ed.type, ed.catIdx);

  /* ---------- exportación ---------- */
  useEffect(() => {
    if (exportCfg && exportResolve.current) {
      const r = exportResolve.current;
      exportResolve.current = null;
      requestAnimationFrame(() => requestAnimationFrame(r));
    }
  }, [exportCfg]);
  const capture = (cfg: CreativeConfig) =>
    new Promise<Blob>((resolve, reject) => {
      exportResolve.current = async () => {
        try {
          if (document.fonts?.ready) await document.fonts.ready;
          if (!exportRef.current) throw new Error('Sin nodo de exportación');
          resolve(await nodeToPng(exportRef.current));
        } catch (e) { reject(e); }
      };
      setExportCfg({ ...cfg });
    });
  const fileName = (format: FormatId) => `${slug(salon)}-${slug(ed.fields.title || T.label)}-${format}.png`;

  /* ---------- navegación del flujo ---------- */
  const openEditor = (o: Partial<EditorState> & { type: TypeId; style: StyleId }) => {
    setModal(null);
    setDone(null);
    setNewPackOpen(false);
    setNewClientOpen(false);
    setClientQ('');
    const next = makeEditor(o);
    if (next.clientName && !next.fieldsManual) {
      const it = withClientVars(getType(next.type).items[next.catIdx] || getType(next.type).items[0], next.clientName);
      next.fields = improveAll(getType(next.type), it, next.tone, next.fields, salon);
    }
    setEd(next);
    setView('editor');
  };
  const finishApply = (typeId: TypeId, idx: number, client?: { id: string | null; name: string | null }) => {
    const t = getType(typeId), it = t.items[idx] || t.items[0], theme = it.theme || 'centro';
    const first = stockByTheme[theme]?.[0]?.id ?? null;
    const clientId = client?.id ?? null;
    const clientName = client?.name ?? null;
    setStockQueryIdx(0);
    if (view === 'editor' && modal?.fromEditor) {
      const withC = withClientVars(it, clientName);
      patch((e) => {
        const baseFields = e.fieldsManual ? e.fields : fieldsFor(typeId, idx);
        const fields = e.fieldsManual ? baseFields : improveAll(t, withC, e.tone, baseFields, salon);
        return {
          type: typeId, catIdx: idx, fields, fieldsManual: e.fieldsManual,
          image: first, imgTheme: theme,
          packTemplateId: it.templateId || null,
          clientId, clientName,
          els: e.elsManual ? { ...e.els, sealText: SEAL_TEXT[typeId] } : recommendElements(e.style, typeId),
        };
      });
      setModal(null);
      showToast('Marlén ha actualizado texto e imagen');
    } else {
      openEditor({
        type: typeId, catIdx: idx, style: t.style, image: first, imgTheme: theme,
        packTemplateId: it.templateId || null, clientId, clientName, fieldsManual: false,
      });
    }
  };
  const apply = (typeId: TypeId, idx: number) => {
    if (TYPES_WITH_CLIENT.includes(typeId)) {
      setModal({
        step: 'client', type: typeId, fromEditor: !!modal?.fromEditor || view === 'editor',
        pendingIdx: idx, pendingClientId: null, pendingClientName: null,
      });
      setClientQ('');
      setNewClientOpen(false);
      return;
    }
    finishApply(typeId, idx);
  };
  const applyClient = (c: { id: string | null; name: string | null } | null) => {
    if (!modal || modal.pendingIdx == null) return;
    finishApply(modal.type, modal.pendingIdx, c || { id: null, name: null });
  };
  const startType = (id: TypeId) => {
    const t = getType(id);
    setNewPackOpen(false);
    if (t.items.length > 1 || id === 'bono') setModal({ step: 'item', type: id, fromEditor: !!modal?.fromEditor || view === 'editor' });
    else apply(id, 0);
  };
  const goHome = () => { setView('home'); setModal(null); patch({ safe: false }); };

  const appendPackItem = (tpl: { id: string; name: string; sessions_total: number; price_cents: number; service_id: string | null }) => {
    const svc = servicesProp.find(s => s.id === tpl.service_id);
    const price = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: tpl.price_cents % 100 === 0 ? 0 : 2 }).format(tpl.price_cents / 100);
    const itemNew = {
      label: tpl.name,
      meta: `${tpl.sessions_total} sesiones${svc ? ` · ${svc.name}` : ''}`,
      price,
      title: tpl.name,
      subtitle: `${tpl.sessions_total} sesiones${svc ? ` · ${svc.name}` : ''}`,
      theme: 'corporal',
      templateId: tpl.id,
      serviceId: tpl.service_id,
      sessionsTotal: tpl.sessions_total,
      priceCents: tpl.price_cents,
      vars: { name: (svc?.name || tpl.name).toLowerCase(), sessions: tpl.sessions_total, salon },
    };
    setTypes(prev => {
      const next = prev.map(t => {
        if (t.id !== 'bono' && t.id !== 'regalo') return t;
        const items = t.id === 'bono'
          ? [itemNew, ...t.items.filter(x => x.templateId)]
          : [{ ...itemNew, title: `Regala ${itemNew.title}`, cta: 'Regalar', vars: { ...itemNew.vars, name: `un ${(svc?.name || 'bono').toLowerCase()}` } }, ...t.items];
        return { ...t, items, note: `${items.length} opción${items.length === 1 ? '' : 'es'}` };
      });
      setActiveCatalog(next);
      return next;
    });
    return 0;
  };

  const createPack = async () => {
    if (formBusy) return;
    const name = packForm.name.trim();
    const sessions = Math.max(1, Math.round(Number(packForm.sessions) || 0));
    const euros = Number(String(packForm.price).replace(',', '.'));
    if (name.length < 2) { showToast('Pon un nombre al bono'); return; }
    if (!sessions) { showToast('Pon al menos una sesión'); return; }
    if (!(euros >= 0)) { showToast('Pon un precio válido'); return; }
    setFormBusy(true);
    try {
      const r = await createPackTemplateQuick({
        name,
        sessionsTotal: sessions,
        priceCents: Math.round(euros * 100),
        serviceId: packForm.serviceId || null,
      });
      if (!r.ok) { showToast(r.error); return; }
      const idx = appendPackItem(r.template);
      setNewPackOpen(false);
      setPackForm({ name: '', sessions: '5', price: '', serviceId: '' });
      showToast(`Bono «${r.template.name}» creado`);
      apply(modal?.type || 'bono', idx);
    } finally {
      setFormBusy(false);
    }
  };

  const createClient = async () => {
    if (formBusy) return;
    const fullName = clientForm.fullName.trim();
    if (fullName.length < 2) { showToast('Pon al menos el nombre'); return; }
    setFormBusy(true);
    try {
      const r = await createClientQuick({ fullName, phone: clientForm.phone });
      if (!r.ok) { showToast(r.error); return; }
      setClients(c => [{ id: r.id, full_name: r.fullName, phone: clientForm.phone || null }, ...c.filter(x => x.id !== r.id)]);
      setNewClientOpen(false);
      setClientForm({ fullName: '', phone: '' });
      applyClient({ id: r.id, name: r.fullName });
    } finally {
      setFormBusy(false);
    }
  };

  /* ---------- acciones del editor ---------- */
  const onField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    patch((s) => ({ fields: { ...s.fields, [name]: value }, fieldsManual: true }));
  };
  const reroll = (field: TextField) => {
    const p = pickLine({ type: T, item, tone: ed.tone, field, salon, exclude: ed.fields[field] });
    if (p) patch((s) => ({ fields: { ...s.fields, [field]: p.txt }, fieldsManual: true }));
  };
  const improve = () => {
    const prev = ed.fields;
    patch({ fields: improveAll(T, item, ed.tone, ed.fields, salon), fieldsManual: true });
    showToast(`Marlén ha reescrito los textos en tono ${ed.tone}.`, { label: 'Deshacer', fn: () => { patch({ fields: prev }); showToast('Textos restaurados'); } });
  };
  const setEditorClient = (c: { id: string | null; name: string | null }) => {
    patch((e) => {
      const it = withClientVars(rawItem, c.name);
      const fields = e.fieldsManual ? e.fields : improveAll(T, it, e.tone, fieldsFor(e.type, e.catIdx), salon);
      return { clientId: c.id, clientName: c.name, fields };
    });
  };
  const pickStyle = (id: StyleId) => patch((e) => ({ style: id, ...(e.toneManual ? {} : { tone: STYLE_TONE[id] }), ...(e.elsManual ? {} : { els: { ...recommendElements(id, e.type), sealText: e.els.sealText } }) }));
  const toggleEl = (k: ElementKey) => patch((e) => ({ els: { ...e.els, [k]: !e.els[k] }, elsManual: true }));
  const autoEls = () => {
    autoN.current += 1;
    const keys = autoN.current % 2 ? ALT[ed.style] : REC[ed.style];
    patch((e) => ({ els: { ...recommendElements(e.style, e.type, keys), sealText: e.els.sealText || SEAL_TEXT[e.type] }, elsManual: false }));
    showToast('Marlén ha elegido elementos para ' + STYLES.find((s) => s.id === ed.style)?.label);
  };
  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // TODO(backend): subir a storage y guardar la URL definitiva; el blob: solo vive en esta sesión.
    const id = 'u' + Date.now();
    setUploads((u) => [{ id, theme: 'mias', label: f.name.replace(/\.[^.]+$/, ''), src: URL.createObjectURL(f), bg: '#E4E3EA' }, ...u]);
    patch({ image: id, imgTheme: 'mias' });
    e.target.value = '';
  };

  const saveAndFinish = async (mode: 'png' | 'share') => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await capture(currentCfg);
      if (mode === 'share') { const ok = await shareBlob(blob, fileName(ed.format), link).catch(() => false); if (!ok) downloadBlob(blob, fileName(ed.format)); }
      else downloadBlob(blob, fileName(ed.format));
      await copyText(link);
      const it: LibraryItem = { id: ed.editingId || 'c' + Date.now(), type: ed.type, catIdx: ed.catIdx, style: ed.style, format: ed.format, image: ed.image, fields: { ...ed.fields }, els: { ...ed.els }, showLogo: ed.showLogo, date: 'Ahora' };
      setLibrary((l) => [it, ...l.filter((x) => x.id !== it.id)]);
      setHighlight(it.id);
      setFilter('all');
      patch({ editingId: it.id, safe: false });
      setDone({ id: it.id, mode, extra: [], sellPack: false, sold: false });
    } catch {
      showToast('No se pudo generar la imagen. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };
  const confirmSellPack = async () => {
    if (!done || sellBusy || !ed.packTemplateId || !ed.clientId || !rawItem) return;
    setSellBusy(true);
    try {
      const r = await sellPackFromMarketing({
        ownerClientId: ed.clientId,
        templateId: ed.packTemplateId,
        name: rawItem.label || rawItem.title,
        serviceId: rawItem.serviceId ?? null,
        sessionsTotal: rawItem.sessionsTotal || Number(rawItem.vars?.sessions) || 1,
        priceCents: rawItem.priceCents ?? 0,
      });
      if (!r.ok) { showToast(r.error); return; }
      setDone(d => (d ? { ...d, sold: true, sellPack: true } : d));
      const name = ed.clientName || 'la clienta';
      showToast(`Bono registrado a ${name}`, {
        label: 'Ver ficha',
        fn: () => { window.location.href = `/clientas/${ed.clientId}`; },
      });
    } finally {
      setSellBusy(false);
    }
  };
  const copyImage = async () => { try { const ok = await copyBlob(await capture(currentCfg)); showToast(ok ? 'Imagen copiada. Pégala en WhatsApp Web o en un email.' : 'Tu navegador no permite copiar imágenes'); } catch { showToast('No se pudo copiar'); } };
  const extraFormat = async (fid: FormatId, label: string) => {
    const base = done && library.find((i) => i.id === done.id);
    if (!base) return;
    try {
      const blob = await capture(cfgOf({ ...base, format: fid }));
      downloadBlob(blob, fileName(fid));
      setLibrary((l) => [l[0], { ...base, id: 'c' + Date.now() + fid, format: fid, date: 'Ahora' }, ...l.slice(1)]);
      setDone((d) => (d ? { ...d, extra: [...d.extra, fid] } : d));
      showToast('Descargada también en ' + label);
    } catch { showToast('No se pudo generar la imagen'); }
  };
  const shareTo = async (target: 'whatsapp' | 'email' | 'instagram' | 'copy') => {
    const base = done && library.find((i) => i.id === done.id);
    if (!base) return;
    const blob = await capture(cfgOf(base));
    if (target === 'copy') { showToast((await copyBlob(blob)) ? 'Imagen copiada' : 'Tu navegador no permite copiar imágenes'); return; }
    if (await shareBlob(blob, fileName(base.format), link).catch(() => false)) return;
    downloadBlob(blob, fileName(base.format));
    if (target === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, '_blank');
    if (target === 'email') window.location.href = `mailto:?subject=${encodeURIComponent(base.fields.title)}&body=${encodeURIComponent(link)}`;
    if (target === 'instagram') showToast('Imagen descargada. Súbela desde Instagram y pega el enlace en el sticker.');
  };

  /* ---------- pasos ---------- */
  const needsClient = TYPES_WITH_CLIENT.includes(modal?.type || ed.type);
  const ctx = modal
    ? (modal.step === 'type' ? 1 : modal.step === 'item' ? 2 : 3)
    : view === 'editor' ? (needsClient ? 4 : 3) : 1;
  const MT = modal ? getType(modal.type) : T;
  const goType = () => setModal((m) => ({ step: 'type', type: m ? m.type : ed.type, fromEditor: m ? m.fromEditor : view === 'editor' }));
  const goItem = () => setModal({ step: 'item', type: ed.type, fromEditor: true });
  const goClient = () => setModal({
    step: 'client', type: ed.type, fromEditor: true, pendingIdx: ed.catIdx,
    pendingClientId: ed.clientId, pendingClientName: ed.clientName,
  });
  const catalogLabel = (() => {
    const it = modal?.step === 'client' && modal.pendingIdx != null
      ? (getType(modal.type).items[modal.pendingIdx] || getType(modal.type).items[0])
      : item;
    const pack = it?.label || 'Del catálogo';
    const who = (modal?.pendingClientName || ed.clientName);
    if (who && (modal?.step === 'client' ? ctx > 3 : ctx > 2) && needsClient) return `${pack} · ${firstName(who)}`;
    return pack;
  })();
  const stepDefs = needsClient
    ? [
        { label: ctx > 1 ? MT.label : 'Qué anuncias', go: goType as (() => void) | undefined },
        { label: ctx > 2 ? catalogLabel : 'Del catálogo', go: goItem as (() => void) | undefined },
        { label: ctx > 3 ? (ed.clientName ? firstName(ed.clientName) : 'Clienta') : 'Clienta', go: goClient as (() => void) | undefined },
        { label: 'Diseño', go: undefined as (() => void) | undefined },
      ]
    : [
        { label: ctx > 1 ? MT.label : 'Qué anuncias', go: goType as (() => void) | undefined },
        { label: ctx > 2 ? item.label : 'Del catálogo', go: goItem as (() => void) | undefined },
        { label: 'Diseño', go: undefined as (() => void) | undefined },
      ];
  const steps = stepDefs.map((s, i) => {
    const n = i + 1, isDone = n < ctx, on = n <= ctx;
    return { n, label: s.label, isDone, on, go: isDone ? s.go : undefined, mw: n === 2 && isDone ? (mobile ? 160 : 280) : 200 };
  });
  const renderStepper = (big: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: big ? 10 : 6, flexWrap: 'wrap', minWidth: 0 }} aria-label="Pasos">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          {i > 0 && <span style={{ width: big ? 24 : 10, height: 1.5, background: s.on ? '#0F0E1A' : '#D9D8E0', flexShrink: 0 }} />}
          <button type="button" onClick={s.go} disabled={!s.go} title={s.go ? 'Cambiar' : undefined} aria-current={s.n === ctx ? 'step' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: big ? 8 : 5, minWidth: 0, maxWidth: s.mw, border: 'none', background: 'none', padding: '4px 2px', cursor: s.go ? 'pointer' : 'default', fontSize: big ? 13 : 12, fontWeight: 600, color: s.on ? '#0F0E1A' : '#6E6D7A' }}>
            <span style={{ width: big ? 24 : 20, height: big ? 24 : 20, borderRadius: '50%', background: s.on ? '#0F0E1A' : '#fff', border: `1.5px solid ${s.on ? '#0F0E1A' : '#C9C8D3'}`, color: s.on ? '#fff' : '#6E6D7A', fontSize: big ? 12 : 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.isDone ? <Icon d={PATH.check} size={big ? 12 : 11} stroke={3} /> : s.n}
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  /* ---------- piezas reutilizables ---------- */
  const tabIdx = Math.max(0, TABS.indexOf(ed.tab));
  const marlenTip = {
    imagen: `He elegido una foto de ${themeLabel(sugTheme)} para tu anuncio. Cámbiala o sube una tuya.`,
    texto: ed.clientName
      ? `Puedo personalizar el texto para ${firstName(ed.clientName)}. Pulsa «Mejorar textos» o edítalo a mano.`
      : 'Pulsa «Mejorar textos» y te propongo otra versión con el tono que elijas.',
    estilo: 'Cada estilo recoloca todo solo. Prueba sin miedo: tu texto y tu imagen se mantienen.',
    elementos: 'Mejor pocos y bien puestos: te propongo dos como máximo y los coloco yo.',
  }[ed.tab];

  const filteredClients = (() => {
    const q = clientQ.trim().toLowerCase();
    if (!q) return clients.slice(0, 12);
    return clients.filter(c => c.full_name.toLowerCase().includes(q) || (c.phone || '').includes(q)).slice(0, 12);
  })();

  const textField = (name: TextField, label: string, m: boolean) => {
    const len = (ed.fields[name] || '').length;
    return (
      <label className={css.field} key={name}>
        <span className={css.label}>{label}<span className={cx(css.counter, len > LIMITS[name] && css.counterOver)}>{len}/{LIMITS[name]}</span></span>
        <span className={css.inputWrap}>
          <input name={name} value={ed.fields[name]} onChange={onField} className={cx(css.input, m && css.inputMobile, css.withAction)} />
          <button type="button" className={css.reroll} title="Otra opción" onClick={() => reroll(name)}><Icon d={PATH.refresh} size={16} stroke={1.9} /></button>
        </span>
      </label>
    );
  };

  const marlenBtn = (label: string, onClick: () => void, title: string) => (
    <button type="button" className={cx(css.btn, css.soft, css.sm)} onClick={onClick} title={title}><Icon d={PATH.sparkle} size={15} stroke={1.9} color="#D000A8" />{label}</button>
  );

  const imagePanel = (m: boolean) => {
    const list =
      ed.imgTheme === 'mias'
        ? uploads
        : stockByTheme[ed.imgTheme] || Object.values(IMAGES).filter(x => x.theme === ed.imgTheme);
    const sel = imgObj(ed.image);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        {!m && (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Imagen</span>
            <span className={css.hint}>Sugerida: {themeLabel(sugTheme)}</span>
          </div>
        )}
        <div className={m ? css.noScrollbar : undefined} style={m ? { display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px' } : { display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[{ id: 'mias', label: 'Tus fotos' + (uploads.length ? ' · ' + uploads.length : '') }, ...THEMES].map(t => (
            <button
              key={t.id}
              type="button"
              className={cx(css.chip, ed.imgTheme === t.id && css.chipOn)}
              onClick={() => {
                setStockQueryIdx(0);
                patch({ imgTheme: t.id });
              }}
              style={m ? { height: 32 } : undefined}
            >
              {t.id === sugTheme && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D000A8' }} />}
              {t.label}
            </button>
          ))}
        </div>
        {ed.imgTheme !== 'mias' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className={cx(css.btn, css.soft, css.sm)}
              disabled={stockLoading}
              onClick={() => setStockQueryIdx(i => i + 1)}
            >
              <Icon d={PATH.refresh} size={15} stroke={1.9} />
              Otras fotos
            </button>
            {stockLoading && <span className={css.hint}>Cargando…</span>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          <button type="button" className={css.tile} style={{ borderColor: ed.image ? '#ECEBF1' : '#0F0E1A' }} onClick={() => patch({ image: null })}>
            <Icon d={PATH.noImage} size={20} />
            Sin imagen
          </button>
          <label className={cx(css.tile, css.tileDashed)} title="Subir una foto tuya">
            <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
            <Icon d={PATH.upload} size={20} />
            Subir foto
          </label>
          {list.map(x => (
            <button key={x.id} type="button" title={x.label} className={cx(css.ring, ed.image === x.id && css.ringOn)} onClick={() => patch({ image: x.id })}>
              <span style={{ display: 'block', position: 'relative', aspectRatio: '1', borderRadius: 8, background: x.bg, overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.src && <img src={x.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
              </span>
            </button>
          ))}
        </div>
        <div className={css.hint}>
          {stockHint
            ? stockHint
            : sel
              ? `${sel.label} · ${themeLabel(sel.theme)}`
              : ed.imgTheme === 'mias' && !uploads.length
                ? 'Sube fotos de tu centro o de tu equipo.'
                : stockLoading
                  ? 'Buscando fotos…'
                  : 'Sin imagen'}
        </div>
      </div>
    );
  };

  const stylePanel = (m: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
      {!m && <span style={{ fontSize: 15, fontWeight: 700 }}>Estilo</span>}
      <div className={m ? css.noScrollbar : undefined} style={m ? { display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 6px' } : { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px 8px' }}>
        {STYLES.map((s) => {
          const on = s.id === ed.style;
          const els = ed.elsManual ? ed.els : { ...recommendElements(s.id, ed.type), sealText: ed.els.sealText };
          return (
            <button key={s.id} type="button" onClick={() => pickStyle(s.id)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, color: '#0F0E1A', textAlign: 'left' }}>
              <div style={{ padding: 3, borderRadius: 13, border: `2px solid ${on ? '#0F0E1A' : 'transparent'}` }}>
                <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 0 0 1px #ECEBF1' }}>
                  <Creative cfg={cfgOf({ ...ed, style: s.id, format: 'portrait', els })} width={m ? 100 : 106} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: on ? 700 : 500, paddingLeft: 4, whiteSpace: 'nowrap' }}>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const elementsPanel = (m: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
      {!m && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 15, fontWeight: 700 }}>Elementos</span>{marlenBtn('Sugerir', autoEls, 'Marlén elige la combinación que mejor funciona con este estilo')}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ELEMENTS.map(([k, label, icon]) => (
          <button key={k} type="button" className={cx(css.chip, css.chipLg, ed.els[k] && css.chipOn)} onClick={() => toggleEl(k)} aria-pressed={!!ed.els[k]}><Icon d={icon} size={18} />{label}</button>
        ))}
        {m && marlenBtn('Sugerir', autoEls, 'Marlén elige la combinación que mejor funciona con este estilo')}
      </div>
      {ed.els.seal && (
        <label className={css.field}><span className={css.label}>Texto del sello</span>
          <input value={ed.els.sealText} maxLength={14} onChange={(e) => { const v = e.target.value; patch((s) => ({ els: { ...s.els, sealText: v }, elsManual: true })); }} className={cx(css.input, m && css.inputMobile)} />
        </label>
      )}
      <div className={css.hint}>Se colocan solos según el estilo, el formato y la imagen.</div>
    </div>
  );

  const textPanel = (m: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: m ? 14 : 16, flexShrink: 0 }}>
      {TYPES_WITH_CLIENT.includes(ed.type) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4957' }}>Clienta</span>
          <button type="button" className={cx(css.chip, ed.clientId && css.chipOn)} onClick={goClient}>
            {ed.clientName ? firstName(ed.clientName) : 'Elegir o crear'}
          </button>
          {ed.clientName && (
            <button type="button" className={css.chip} onClick={() => setEditorClient({ id: null, name: null })}>Quitar</button>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {!m && <span style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>Texto</span>}
        {m && <div style={{ display: 'flex', gap: 6 }}>{TONES.map(([id, label]) => <button key={id} type="button" className={cx(css.chip, ed.tone === id && css.chipOn)} style={{ height: 32 }} onClick={() => patch({ tone: id, toneManual: true })}>{label}</button>)}</div>}
        {marlenBtn(m ? 'Mejorar' : 'Mejorar textos', improve, 'Marlén reescribe antetítulo, titular, subtítulo y botón con el tono elegido')}
      </div>
      {!m && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4957', marginRight: 2 }}>Tono</span>
          {TONES.map(([id, label, hint]) => <button key={id} type="button" title={hint} className={cx(css.chip, ed.tone === id && css.chipOn)} onClick={() => patch({ tone: id, toneManual: true })}>{label}</button>)}
        </div>
      )}
      {textField('eyebrow', 'Antetítulo', m)}
      {textField('title', 'Titular', m)}
      {textField('subtitle', 'Subtítulo', m)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: m ? 10 : 12 }}>
        <label className={css.field}><span className={css.label}>Precio</span><input name="price" value={ed.fields.price} placeholder="Opcional" onChange={onField} className={cx(css.input, m && css.inputMobile)} /></label>
        {textField('cta', 'Botón', m)}
      </div>
      <label className={css.field}>
        <span className={css.label}>Enlace de reserva</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={link} onChange={(e) => setLink(e.target.value)} className={cx(css.input, m && css.inputMobile)} style={{ flex: 1, minWidth: 0 }} />
          {!m && <button type="button" className={cx(css.btn, css.ghost)} style={{ borderRadius: 12, padding: '0 14px', fontSize: 13 }} onClick={async () => { await copyText(link); showToast('Enlace copiado'); }}>Copiar</button>}
        </div>
        <span className={css.hint}>Se copia al descargar, para pegarlo en la story, el estado de WhatsApp o el email.</span>
      </label>
      <button type="button" onClick={() => patch((s) => ({ showLogo: !s.showLogo }))} aria-pressed={ed.showLogo}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: m ? 52 : 48, padding: '0 14px', borderRadius: 12, border: '1px solid #E4E3EA', background: '#fff', cursor: 'pointer', color: '#0F0E1A', fontSize: 14, fontWeight: 600 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><img src={logo} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />Mostrar logo del centro</span>
        <span className={cx(css.switch, ed.showLogo && css.switchOn)} />
      </button>
    </div>
  );
  const tabPanel = (m: boolean) => ({ imagen: imagePanel, estilo: stylePanel, elementos: elementsPanel, texto: textPanel }[ed.tab](m));

  const formatSeg = (m: boolean) => (
    <div className={css.seg} style={m ? { gap: 3, padding: 3 } : undefined}>
      {FORMATS.map((f) => (
        <button key={f.id} type="button" className={cx(css.segBtn, f.id === ed.format && css.segBtnOn)} style={m ? { height: 34, padding: '0 12px', fontSize: 12, gap: 6 } : undefined} onClick={() => patch({ format: f.id })}>
          <span className={css.ratio} style={{ width: f.iw, height: f.ih }} />{m ? f.ratio : f.label}
        </button>
      ))}
    </div>
  );

  const pad = mobile ? 12 : 36;
  const pw = preview.w || (mobile ? 390 : 900), ph = preview.h || (mobile ? 260 : 640);
  const previewW = Math.max(60, Math.floor(Math.min(pw - pad * 2, ((ph - pad * 2) * 1080) / F.H, mobile ? 999 : 620)));

  /* ---------- biblioteca ---------- */
  const filtered = library.filter((i) => filter === 'all' || i.format === filter);
  const box = mobile ? { w: 169, h: 211, p: 12 } : { w: 232, h: 290, p: 20 };
  const libraryGrid = (
    filtered.length ? (
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, 232px)', gap: mobile ? '20px 12px' : '28px 20px' }}>
        {filtered.map((i) => {
          const t = getType(i.type), f = FORMATS.find((x) => x.id === i.format)!;
          const tw = Math.floor(Math.min(box.w - box.p * 2, ((box.h - box.p * 2) * 1080) / FORMAT_H[i.format]));
          return (
            <div key={i.id} onClick={() => openEditor({ ...i, editingId: i.id, imgTheme: imgObj(i.image)?.theme || suggestTheme(i.type, i.catIdx), tone: STYLE_TONE[i.style], tab: 'texto' })} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: mobile ? 8 : 12, minWidth: 0 }}>
              <div className={css.libThumb} style={{ height: box.h, borderRadius: mobile ? 14 : 16, boxShadow: highlight === i.id ? '0 0 0 2px #D000A8' : 'none' }}>
                <Creative cfg={cfgOf(i)} width={tw} radius={mobile ? 5 : 6} shadow />
                {highlight === i.id && <span className={css.badgeNew}>Nueva</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <div style={{ fontSize: mobile ? 13 : 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.fields.title}</div>
                  <div style={{ fontSize: 12, color: '#6E6D7A' }}>{mobile ? `${f.ratio} · ${i.date}` : `${f.label} · ${t.label} · ${i.date}`}</div>
                </div>
                {!mobile && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button type="button" className={css.iconBtn} title="Descargar PNG" onClick={async (e) => { e.stopPropagation(); downloadBlob(await capture(cfgOf(i)), `${slug(salon)}-${slug(i.fields.title)}-${i.format}.png`); }}><Icon d={PATH.download} /></button>
                    <button type="button" className={css.iconBtn} title="Eliminar" onClick={(e) => { e.stopPropagation(); setLibrary((l) => l.filter((x) => x.id !== i.id)); showToast('Creatividad eliminada'); }}><Icon d={PATH.trash} /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div style={{ border: '1.5px dashed #DCDBE3', borderRadius: 16, padding: mobile ? '28px 20px' : '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{library.length ? 'Nada en este filtro' : 'Aún no has creado ninguna'}</div>
        <div style={{ fontSize: 14, color: '#6E6D7A' }}>{library.length ? 'Prueba con «Todas».' : 'Lo que descargues o compartas aparecerá aquí.'}</div>
      </div>
    )
  );
  const filters = (
    <div style={{ display: 'flex', gap: mobile ? 4 : 6 }}>
      {([['all', 'Todas'], ['story', '9:16'], ['square', '1:1'], ['portrait', '4:5']] as const).map(([id, label]) => (
        <button key={id} type="button" className={cx(css.filter, filter === id && css.filterOn)} style={mobile ? { height: 32, padding: '0 12px', fontSize: 12 } : undefined} onClick={() => setFilter(id)}>{label}</button>
      ))}
    </div>
  );

  /* ---------- vistas ---------- */
  const home = mobile ? (
    <div className={css.scroll} style={{ paddingBottom: 32 }}>
      <div style={{ padding: '8px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className={css.circle} onClick={onBack} aria-label="Volver"><Icon d={PATH.back} size={20} stroke={2} /></button>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em' }}>Marketing</h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: '#6E6D7A' }}>Imágenes con la marca de tu centro para Instagram, WhatsApp o email.</p>
      </div>
      <section style={{ margin: '20px 16px 0', background: '#F6F6F9', borderRadius: 22, padding: '18px 14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MarlenAvatar size={36} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Hola, soy Marlén</h2><span style={{ fontSize: 12, color: '#4A4957', lineHeight: 1.35 }}>Tu diseñadora. Elige qué anunciar y yo lo preparo.</span></div>
          </div>
          {renderStepper(false)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {types.map((t) => (
            <button key={t.id} type="button" className={css.typeCard} style={{ padding: 14, gap: 10, borderRadius: 16, minHeight: 128 }} onClick={() => startType(t.id)}>
              <span className={css.typeIcon} style={{ width: 36, height: 36, borderRadius: 10 }}><Icon d={t.icon} size={19} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 15, fontWeight: 700 }}>{t.label}</span><span style={{ fontSize: 12, color: '#6E6D7A', lineHeight: 1.35 }}>{t.desc}</span></span>
            </button>
          ))}
        </div>
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '28px 20px 0' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Tus creatividades <span style={{ color: '#6E6D7A', fontWeight: 500 }}>· {library.length}</span></h2>
        {filters}
        {libraryGrid}
      </section>
    </div>
  ) : (
    <div className={css.scroll}>
      <div style={{ maxWidth: 1320, padding: '32px 40px 64px', display: 'flex', flexDirection: 'column', gap: 36 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <button type="button" className={css.circle} style={{ width: 48, height: 48 }} onClick={onBack} aria-label="Volver"><Icon d={PATH.back} size={20} stroke={2} /></button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: '48px' }}>Marketing</h1>
            <p style={{ margin: 0, fontSize: 15, color: '#6E6D7A' }}>Imágenes con la marca de tu centro para Instagram, WhatsApp o email.</p>
          </div>
        </div>
        <section style={{ background: '#F6F6F9', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <MarlenAvatar size={48} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em' }}>Hola, soy Marlén, tu diseñadora</h2>
                <p style={{ margin: 0, fontSize: 14, color: '#4A4957' }}>Dime qué quieres anunciar y te preparo imagen, texto y estilo. Tú solo das el último toque.</p>
              </div>
            </div>
            {renderStepper(true)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {types.map((t) => (
              <button key={t.id} type="button" className={css.typeCard} onClick={() => startType(t.id)}>
                <span className={css.typeIcon}><Icon d={t.icon} size={22} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 16, fontWeight: 700 }}>{t.label}</span><span style={{ fontSize: 13, color: '#6E6D7A', lineHeight: 1.4 }}>{t.desc}</span></span>
                <span style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8, fontSize: 12, fontWeight: 600, color: '#4A4957' }}>{t.note}<Icon d={PATH.next} size={16} stroke={2} /></span>
              </button>
            ))}
          </div>
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Tus creatividades <span style={{ color: '#6E6D7A', fontWeight: 500 }}>· {library.length}</span></h2>
            {filters}
          </div>
          {libraryGrid}
        </section>
      </div>
    </div>
  );

  const edTitle = ed.editingId ? 'Editar creatividad' : 'Nueva creatividad';
  const nextBtn = tabIdx < 3 && (
    <button type="button" className={cx(css.btn, css.outline, mobile ? undefined : css.md)} style={mobile ? { alignSelf: 'flex-end', flexShrink: 0, fontSize: 13 } : undefined} onClick={() => patch({ tab: TABS[tabIdx + 1] })}>
      Siguiente: {TAB_LABEL[TABS[tabIdx + 1]]}<Icon d={PATH.next} size={16} stroke={2} />
    </button>
  );

  const editor = mobile ? (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', height: 56, flexShrink: 0 }}>
        <button type="button" className={css.circle} onClick={goHome} aria-label="Cerrar"><Icon d={PATH.close} size={20} stroke={2} /></button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{edTitle}</div>
        <div style={{ width: 44 }} />
      </div>
      <div style={{ padding: '0 14px 8px', flexShrink: 0 }}>{renderStepper(false)}</div>
      <div style={{ height: 316, flexShrink: 0, background: '#F6F6F9', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div ref={previewRef} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Creative cfg={currentCfg} width={previewW} radius={8} shadow safe={ed.safe} />
        </div>
        {ed.format === 'story' && (
          <button type="button" onClick={() => patch((s) => ({ safe: !s.safe }))} title="Zonas seguras (stories y estados)" aria-pressed={ed.safe}
            style={{ position: 'absolute', top: 10, right: 10, height: 32, padding: '0 10px', borderRadius: 999, border: 'none', background: ed.safe ? '#D000A8' : '#fff', color: ed.safe ? '#fff' : '#0F0E1A', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 3px rgba(15,14,26,0.1)', cursor: 'pointer' }}>
            <Icon d={PATH.safe} size={14} stroke={2} />Zonas
          </button>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 0 10px' }}>
          {formatSeg(true)}
          <div style={{ fontSize: 11, color: '#5E5D6B' }}>{F.usage}</div>
        </div>
      </div>
      <div className={css.mTabs}>
        {TABS.map((id) => <button key={id} type="button" className={cx(css.mTab, ed.tab === id && css.mTabOn)} onClick={() => patch({ tab: id })}>{TAB_LABEL[id]}</button>)}
      </div>
      <div className={css.scroll} style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}><MarlenAvatar size={20} /><span style={{ fontSize: 12, color: '#4A4957', lineHeight: 1.4 }}>{marlenTip}</span></div>
        {tabPanel(true)}
        {nextBtn}
      </div>
      <div style={{ padding: '12px 16px 28px', borderTop: '1px solid #ECEBF1', background: '#fff', flexShrink: 0, display: 'flex', gap: 10 }}>
        <button type="button" className={css.circle} style={{ width: 52, height: 52, background: '#fff', border: '1px solid #E4E3EA' }} title="Descargar PNG" onClick={() => saveAndFinish('png')}><Icon d={PATH.download} size={20} stroke={2} /></button>
        <button type="button" className={cx(css.btn, css.primary, css.lg)} style={{ flex: 1, opacity: busy ? 0.6 : 1 }} onClick={() => saveAndFinish('share')}><Icon d={PATH.share} size={18} stroke={2} />{busy ? 'Preparando…' : 'Compartir'}</button>
      </div>
    </div>
  ) : (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 28px', borderBottom: '1px solid #ECEBF1', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" className={css.circle} onClick={goHome} aria-label="Volver a Marketing"><Icon d={PATH.back} size={20} stroke={2} /></button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}><div style={{ fontSize: 13, color: '#6E6D7A' }}>Marketing</div><div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{edTitle}</div></div>
        </div>
        {renderStepper(true)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className={cx(css.btn, css.ghost)} onClick={goHome}>Cancelar</button>
          <button type="button" className={cx(css.btn, css.ghost)} onClick={copyImage}><Icon d={PATH.copy} size={17} />Copiar imagen</button>
          <button type="button" className={cx(css.btn, css.primary)} style={{ opacity: busy ? 0.6 : 1 }} onClick={() => saveAndFinish('png')}><Icon d={PATH.download} size={18} stroke={2} />{busy ? 'Generando PNG…' : 'Descargar PNG'}</button>
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '420px minmax(0, 1fr)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid #ECEBF1' }}>
          <div style={{ padding: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
            <div className={css.tabs}>{TABS.map((id) => <button key={id} type="button" className={cx(css.tab, ed.tab === id && css.tabOn)} onClick={() => patch({ tab: id })}>{TAB_LABEL[id]}</button>)}</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}><MarlenAvatar size={24} /><span style={{ fontSize: 13, color: '#4A4957', lineHeight: 1.45 }}>{marlenTip}</span></div>
          </div>
          <div className={css.scroll} style={{ padding: '18px 24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>{tabPanel(false)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderTop: '1px solid #ECEBF1', flexShrink: 0 }}>
            {tabIdx > 0 && <button type="button" className={cx(css.btn, css.md)} style={{ background: 'none', color: '#4A4957', padding: '0 12px' }} onClick={() => patch({ tab: TABS[tabIdx - 1] })}><Icon d={PATH.back} size={16} stroke={2} />{TAB_LABEL[TABS[tabIdx - 1]]}</button>}
            <span style={{ flex: 1 }} />
            {nextBtn}
            {tabIdx === 3 && <button type="button" className={cx(css.btn, css.primary, css.md)} style={{ opacity: busy ? 0.6 : 1 }} onClick={() => saveAndFinish('png')}><Icon d={PATH.download} size={16} stroke={2} />Todo listo · Descargar</button>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', background: '#F6F6F9', minHeight: 0, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 24px 0', flexWrap: 'wrap' }}>
            {formatSeg(false)}
            {ed.format === 'story' && (
              <button type="button" onClick={() => patch((s) => ({ safe: !s.safe }))} aria-pressed={ed.safe} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 4px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#0F0E1A' }}>
                <span className={cx(css.switch, css.switchMagenta, ed.safe && css.switchOn)} />Zonas seguras (stories y estados)
              </button>
            )}
          </div>
          <div ref={previewRef} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Creative cfg={currentCfg} width={previewW} radius={14} shadow safe={ed.safe} />
          </div>
          <div style={{ padding: '0 24px 20px', textAlign: 'center', fontSize: 13, color: '#6E6D7A' }}>{F.px} · {F.usage}</div>
        </div>
      </div>
    </div>
  );

  /* ---------- modal pasos tipo / catálogo / clienta ---------- */
  const modalTitle =
    modal?.step === 'type' ? '¿Qué quieres anunciar?'
      : modal?.step === 'client' ? '¿Para qué clienta?'
        : MT.question;
  const modalView = modal && (
    <div className={cx(css.overlay, mobile && css.overlayMobile)} onClick={() => setModal(null)}>
      <div className={cx(css.panel, mobile && css.panelMobile)} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {mobile && <div className={css.handle} />}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {modal.step === 'item' && <button type="button" className={css.circle} style={{ width: 40, height: 40 }} onClick={goType} title="Otro tipo"><Icon d={PATH.back} stroke={2} /></button>}
          {modal.step === 'client' && (
            <button type="button" className={css.circle} style={{ width: 40, height: 40 }} onClick={() => setModal(m => m ? { ...m, step: 'item' } : m)} title="Otro ítem">
              <Icon d={PATH.back} stroke={2} />
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            {renderStepper(false)}
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{modalTitle}</span>
          </div>
          <button type="button" className={css.circle} style={{ width: 40, height: 40 }} onClick={() => setModal(null)} aria-label="Cerrar"><Icon d={PATH.close} stroke={2} /></button>
        </div>
        {modal.step === 'type' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {types.map((t) => {
              const on = modal.fromEditor && t.id === ed.type;
              return (
                <button key={t.id} type="button" className={cx(css.rowItem, on && css.rowItemOn)} style={{ gap: 12, borderRadius: 14 }} onClick={() => startType(t.id)}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: on ? '#0F0E1A' : '#F2F2F7', color: on ? '#fff' : '#0F0E1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon d={t.icon} size={19} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</span><span style={{ fontSize: 12, color: '#6E6D7A', lineHeight: 1.3 }}>{t.desc}</span></span>
                </button>
              );
            })}
          </div>
        )}
        {modal.step === 'item' && (
          <>
            <div className={css.listStack}>
              {MT.items.map((it, i) => (
                <button key={`${it.templateId || it.label}-${i}`} type="button" className={cx(css.rowItem, modal.fromEditor && modal.type === ed.type && i === ed.catIdx && css.rowItemOn)} onClick={() => apply(modal.type, i)}>
                  <span style={{ width: 52, height: 52, borderRadius: 12, background: IMAGES[`${it.theme || 'centro'}-0`]?.bg, flexShrink: 0 }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}><span style={{ fontSize: 15, fontWeight: 600 }}>{it.label}</span><span style={{ fontSize: 13, color: '#6E6D7A' }}>{it.meta}</span></span>
                  {it.price && <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>{it.price}</span>}
                  <Icon d={PATH.chevronRight} color="#6E6D7A" stroke={2} />
                </button>
              ))}
            </div>
            <div className={css.hint}>Con estos datos Marlén prepara el texto y la imagen. Podrás cambiarlo todo después.</div>
            {(modal.type === 'bono' || modal.type === 'regalo') && (
              <div className={css.footerAction}>
                {!newPackOpen ? (
                  <button type="button" className={cx(css.btn, css.outline, css.block, css.lg)} onClick={() => setNewPackOpen(true)}>
                    Crear nuevo bono
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 16, background: '#F6F6F9' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Nuevo bono</span>
                    <label className={css.field}><span className={css.label}>Nombre</span><input className={cx(css.input, css.inputMobile)} value={packForm.name} onChange={e => setPackForm(f => ({ ...f, name: e.target.value }))} placeholder="Bono 5 sesiones · Facial" /></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className={css.field}><span className={css.label}>Sesiones</span><input className={cx(css.input, css.inputMobile)} inputMode="numeric" value={packForm.sessions} onChange={e => setPackForm(f => ({ ...f, sessions: e.target.value }))} /></label>
                      <label className={css.field}><span className={css.label}>Precio (€)</span><input className={cx(css.input, css.inputMobile)} inputMode="decimal" value={packForm.price} onChange={e => setPackForm(f => ({ ...f, price: e.target.value }))} placeholder="180" /></label>
                    </div>
                    <label className={css.field}>
                      <span className={css.label}>Servicio (opcional)</span>
                      <select className={cx(css.input, css.inputMobile)} value={packForm.serviceId} onChange={e => setPackForm(f => ({ ...f, serviceId: e.target.value }))}>
                        <option value="">Sin servicio fijo</option>
                        {servicesProp.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className={cx(css.btn, css.ghost, css.block)} onClick={() => setNewPackOpen(false)}>Cancelar</button>
                      <button type="button" className={cx(css.btn, css.primary, css.block)} style={{ opacity: formBusy ? 0.6 : 1 }} onClick={() => void createPack()}>{formBusy ? 'Creando…' : 'Crear y usar'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {modal.step === 'client' && (
          <>
            <button type="button" className={css.skipLink} onClick={() => applyClient({ id: null, name: null })}>
              Continuar sin clienta
            </button>
            <div className={css.searchWrap}>
              <span className={css.searchIcon}><Icon d={PATH.search} size={18} stroke={2} /></span>
              <input
                className={css.input}
                value={clientQ}
                onChange={e => setClientQ(e.target.value)}
                placeholder="Buscar por nombre o teléfono"
                autoFocus={!mobile}
                inputMode="search"
                enterKeyHint="search"
              />
            </div>
            <div className={css.listStack}>
              {filteredClients.map(c => (
                <button key={c.id} type="button" className={cx(css.rowItem, (modal.pendingClientId || ed.clientId) === c.id && css.rowItemOn)} onClick={() => applyClient({ id: c.id, name: c.full_name })}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{c.full_name}</span>
                    {c.phone && <span style={{ fontSize: 13, color: '#6E6D7A' }}>{c.phone}</span>}
                  </span>
                  <Icon d={PATH.chevronRight} color="#6E6D7A" stroke={2} />
                </button>
              ))}
              {!filteredClients.length && (
                <div className={css.hint} style={{ padding: '8px 2px' }}>
                  {clientQ.trim() ? 'No hay coincidencias.' : 'Aún no hay clientas. Crea una abajo.'}
                </div>
              )}
            </div>
            <div className={css.footerAction}>
              {!newClientOpen ? (
                <button type="button" className={cx(css.btn, css.outline, css.block, css.lg)} onClick={() => setNewClientOpen(true)}>
                  Crear nueva clienta
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 16, background: '#F6F6F9' }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Nueva clienta</span>
                  <label className={css.field}><span className={css.label}>Nombre</span><input className={cx(css.input, css.inputMobile)} value={clientForm.fullName} onChange={e => setClientForm(f => ({ ...f, fullName: e.target.value }))} placeholder="María López" autoFocus /></label>
                  <label className={css.field}><span className={css.label}>Teléfono (opcional)</span><input className={cx(css.input, css.inputMobile)} value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} inputMode="tel" /></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className={cx(css.btn, css.ghost, css.block)} onClick={() => setNewClientOpen(false)}>Cancelar</button>
                    <button type="button" className={cx(css.btn, css.primary, css.block)} style={{ opacity: formBusy ? 0.6 : 1 }} onClick={() => void createClient()}>{formBusy ? 'Creando…' : 'Crear y usar'}</button>
                  </div>
                </div>
              )}
              <div className={css.hint}>La clienta personaliza el texto y, si quieres, puedes registrarle el bono al publicar.</div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  /* ---------- cierre: lista para publicar ---------- */
  const DI = done && library.find((i) => i.id === done.id);
  const doneView = done && DI && (
    <div className={cx(css.overlay, mobile && css.overlayMobile)} style={{ zIndex: 35 }} onClick={() => setDone(null)}>
      <div className={cx(css.panel, mobile && css.panelMobile)} style={{ maxWidth: mobile ? undefined : 680, gap: 20 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {mobile && <div className={css.handle} />}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 auto', width: 180, height: 240, margin: '0 auto', borderRadius: 16, background: '#F6F6F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Creative cfg={cfgOf(DI)} width={Math.floor(Math.min(156, (216 * 1080) / FORMAT_H[DI.format]))} radius={6} shadow />
          </div>
          <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MarlenAvatar size={40} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{done.mode === 'share' ? 'Lista para compartir' : 'Lista para publicar'}</span>
                <span style={{ fontSize: 13, color: '#4A4957', lineHeight: 1.4 }}>{done.mode === 'share' ? 'Guardada en tus creatividades. Elige dónde enviarla.' : 'PNG descargado y guardado en tus creatividades. El enlace de reserva ya está copiado.'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4957' }}>Compartir en</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {([['whatsapp', 'WhatsApp', PATH.whatsapp], ['email', 'Email', PATH.email], ['instagram', 'Instagram', PATH.instagram], ['copy', 'Copiar imagen', PATH.copy]] as const).map(([id, label, d]) => (
                  <button key={id} type="button" className={cx(css.btn, css.ghost, css.md)} onClick={() => shareTo(id)}><Icon d={d} size={17} />{label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4957' }}>Descargar también en</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FORMATS.filter((f) => f.id !== DI.format).map((f) => {
                  const did = done.extra.includes(f.id);
                  return (
                    <button key={f.id} type="button" className={cx(css.btn, css.md, did ? css.soft : css.ghost)} disabled={did} onClick={() => extraFormat(f.id, f.label)}>
                      <span className={css.ratio} style={{ width: f.iw, height: f.ih }} />{f.label}{did && ' ✓'}
                    </button>
                  );
                })}
              </div>
              <span className={css.hint}>Marlén recoloca imagen, texto y elementos para cada formato.</span>
            </div>
            {ed.packTemplateId && ed.clientId && ed.clientName && !done.sold && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, border: '1px solid #E4E3EA', background: '#FBFBFD', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!done.sellPack}
                  onChange={e => setDone(d => (d ? { ...d, sellPack: e.target.checked } : d))}
                  style={{ marginTop: 3 }}
                />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Registrar bono a {firstName(ed.clientName)}</span>
                  <span style={{ fontSize: 12, color: '#6E6D7A', lineHeight: 1.4 }}>Opcional. Crea el bono en su ficha con el precio de la plantilla (pago pendiente).</span>
                </span>
              </label>
            )}
            {done.sold && (
              <div className={css.hint}>Bono registrado a {ed.clientName}.</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #ECEBF1', paddingTop: 16 }}>
          <button type="button" className={cx(css.btn, css.ghost)} style={{ flex: '1 1 auto' }} onClick={() => setDone(null)}>Seguir editando</button>
          <button type="button" className={cx(css.btn, css.ghost)} style={{ flex: '1 1 auto' }} onClick={() => { setDone(null); setView('home'); setModal({ step: 'type', type: ed.type, fromEditor: false }); }}>Crear otra</button>
          {done.sellPack && !done.sold ? (
            <button type="button" className={cx(css.btn, css.primary)} style={{ flex: '1 1 auto', opacity: sellBusy ? 0.6 : 1 }} onClick={() => void confirmSellPack()}>
              {sellBusy ? 'Registrando…' : `Registrar bono a ${firstName(ed.clientName || '')}`}
            </button>
          ) : (
            <button type="button" className={cx(css.btn, css.primary)} style={{ flex: '1 1 auto' }} onClick={() => { setDone(null); setView('home'); showToast('Guardada en tus creatividades'); }}>Ver mis creatividades</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={css.root}>
      {view === 'home' ? home : editor}
      {modalView}
      {doneView}
      {toast && (
        <div className={css.toast} style={{ bottom: mobile ? (view === 'editor' ? 104 : 24) : 28 }} role="status">
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', color: '#0F0E1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon d={PATH.check} size={14} stroke={2.6} /></span>
          <span>{toast.msg}</span>
          {toast.action && <button type="button" className={css.toastAction} onClick={toast.action.fn}>{toast.action.label}</button>}
        </div>
      )}
      {/* Escenario de exportación: render a 1080 px real, fuera de pantalla */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>
        {exportCfg && <CreativeCanvas ref={exportRef} cfg={exportCfg} />}
      </div>
    </div>
  );
}
