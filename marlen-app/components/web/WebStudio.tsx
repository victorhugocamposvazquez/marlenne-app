'use client';

import React, { useEffect, useRef, useState } from 'react';
import WebSite from './WebSite';
import { Icon, MarlenAvatar } from '@/components/marketing/Icons';
import {
  BANK, DEFAULT_EXTRAS, DNS_RECORDS, ICONS, RESERVED, SECTIONS, SERVICES, SERVICE_MEDIA, TABS, TAKEN_DEMO, TEAM as TEAM_DEMO, TEMPLATES, TEXTS, TEXT_LIMITS, TIPS,
  bankImg, lookOf, palettesFor, slugify, tplOf,
} from '@/lib/web/data';
import type { BookingMode, Extras, IconStyle, Photo, Sections, Service, ServiceMedia, SiteTexts, TabId, Tone } from '@/lib/web/types';
import { searchStockByTheme } from '@/app/actions/marketing-stock';
import { stockProxyPath } from '@/lib/marketing/stock';
import { themeForService } from '@/lib/web/from-salon';

const INK = '#0F0E1A', MUTED = '#6E6D7A', SOFT = '#F2F2F7', CANVAS = '#F6F6F9', LINE = '#ECEBF1', BORDER = '#E4E3EA', GREEN = '#1A7F4E', MAGENTA = '#D000A8';
const P_LOCK = 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z', P_CHECK = 'M5 12l5 5 9-10', P_BACK = 'M15 5l-7 7 7 7', P_NEXT = 'M5 12h14M13 6l6 6-6 6', P_UP = 'M12 16V5M7 10l5-5 5 5M5 19h14';

function useIsMobile(bp = 768) {
  const [m, setM] = useState(false);
  useEffect(() => { const q = window.matchMedia(`(max-width: ${bp - 1}px)`); const f = () => setM(q.matches); f(); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, [bp]);
  return m;
}
const fileToPhoto = (e: React.ChangeEvent<HTMLInputElement>): Photo | null => {
  const f = e.target.files?.[0]; e.target.value = '';
  // TODO(backend): subir a storage y guardar la URL definitiva.
  return f ? { bg: `url("${URL.createObjectURL(f)}") center / cover no-repeat`, label: null, mine: true } : null;
};

const Switch = ({ on, disabled, w = 44 }: { on: boolean; disabled?: boolean; w?: number }) => (
  <span style={{ width: w, height: w * 0.59, borderRadius: 999, background: on && !disabled ? GREEN : '#D9D8E0', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
    <span style={{ position: 'absolute', top: 3, left: 3, width: w * 0.59 - 6, height: w * 0.59 - 6, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.2)', transform: on ? `translateX(${w - w * 0.59}px)` : 'none', transition: 'transform .15s' }} />
  </span>
);
function Seg<T extends string>({ items, value, onChange, h = 36 }: { items: [T, string][]; value: T; onChange: (v: T) => void; h?: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, padding: 3, background: SOFT, borderRadius: 11 }}>
      {items.map(([k, label]) => { const on = k === value; return (
        <button key={k} type="button" onClick={() => onChange(k)} style={{ flex: '1 1 0', minWidth: 0, height: h, border: 'none', borderRadius: 8, background: on ? '#fff' : 'transparent', color: on ? INK : MUTED, boxShadow: on ? '0 1px 3px rgba(15,14,26,.14)' : 'none', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}>{label}</button>
      ); })}
    </div>
  );
}
const H = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 15, fontWeight: 700 }}>{children}</span>{sub && <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{sub}</span>}</div>
);
const Upload = ({ onFile, label = 'Subir foto' }: { onFile: (e: React.ChangeEvent<HTMLInputElement>) => void; label?: string }) => (
  <label style={{ height: 40, padding: '0 14px', borderRadius: 999, border: `1.5px solid ${INK}`, background: '#fff', color: INK, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
    <input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} /><Icon d={P_UP} size={15} stroke={2} />{label}
  </label>
);
const btn = (primary = false): React.CSSProperties => ({ height: 44, padding: '0 18px', borderRadius: 999, border: primary ? 'none' : `1px solid ${BORDER}`, background: primary ? INK : '#fff', color: primary ? '#fff' : INK, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', whiteSpace: 'nowrap' });
const input = (m: boolean): React.CSSProperties => ({ width: '100%', height: m ? 48 : 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: m ? 15 : 14, color: INK, outline: 'none', fontFamily: 'inherit' });

export interface WebStudioProps {
  brandColor?: string;
  salon?: string;
  logo?: string;
  phone?: string | null;
  address?: string | null;
  bookingUrl?: string;
  /** Catálogo real del centro (si falta, demo del handoff). */
  services?: Service[];
  /** Equipo real: [nombre, especialidad] */
  team?: [string, string][];
  startView?: 'intro' | 'editor';
  onBack?: () => void;
  onOpenCreatives?: () => void;
}

export default function WebStudio({
  brandColor = '#C5AC6A',
  salon = 'Tu centro',
  logo = '/marketing/arlett-logo.png',
  phone = null,
  address = null,
  bookingUrl = '',
  services: servicesProp,
  team: teamProp,
  startView = 'intro',
  onBack,
  onOpenCreatives,
}: WebStudioProps) {
  const mob = useIsMobile();
  const initialSvcs = servicesProp?.length ? servicesProp : SERVICES;
  const teamRows = teamProp?.length ? teamProp : TEAM_DEMO;
  const [view, setView] = useState<'intro' | 'editor'>(startView);
  const [tplId, setTplId] = useState('atelier');
  const [palId, setPalId] = useState('crema');
  const [tone, setTone] = useState<Tone>('cercano');
  const [txtIdx, setTxtIdx] = useState(0);
  const [txt, setTxt] = useState<SiteTexts>(() => {
    const base = { ...TEXTS.cercano[0] };
    return {
      ...base,
      heroSub: base.heroSub.replace(/Arlett Beauty|Madrid/g, salon).replace(/en Madrid/, ''),
      aboutTitle: base.aboutTitle.includes('Arlett') ? `Somos ${salon}` : base.aboutTitle,
      aboutText: base.aboutText.replace(/Arlett Beauty/g, salon),
    };
  });
  const [txtManual, setTxtManual] = useState(false);
  const [sec, setSec] = useState<Sections>({ servicios: true, nosotros: true, equipo: true, visitanos: true });
  const [tab, setTab] = useState<TabId>('look');
  const [tool, setTool] = useState<TabId | null>(null);
  const [device, setDevice] = useState<'desk' | 'mob'>('desk');
  const [fx, setFx] = useState<Extras>(() => ({
    ...DEFAULT_EXTRAS,
    waNum: (phone || '').replace(/\D/g, '').slice(-9) || DEFAULT_EXTRAS.waNum,
    waMsg: `Hola, quiero pedir cita en ${salon}`,
  }));
  const [svcs, setSvcs] = useState<Service[]>(initialSvcs);
  useEffect(() => {
    if (servicesProp?.length) setSvcs(servicesProp);
  }, [servicesProp]);
  const [svcOpen, setSvcOpen] = useState<string | null>(initialSvcs[0]?.id ?? null);
  const [photos, setPhotos] = useState<{ hero: Photo | null; about: Photo | null; team: (Photo | null)[] }>({
    hero: null,
    about: null,
    team: teamRows.map(() => null),
  });
  useEffect(() => {
    setPhotos(p => ({ ...p, team: teamRows.map((_, i) => p.team[i] ?? null) }));
  }, [teamRows]);
  const [phTarget, setPhTarget] = useState<'hero' | 'about' | 'team'>('hero');
  const [phTheme, setPhTheme] = useState('facial');
  const [svcMedia, setSvcMedia] = useState<ServiceMedia | null>(null);
  const [iconStyle, setIconStyle] = useState<IconStyle>('line');
  const [svcImg, setSvcImg] = useState<Record<string, Photo>>({});
  const [svcIcon, setSvcIcon] = useState<Record<string, string>>({});
  const [mediaOpen, setMediaOpen] = useState<string | null>(null);
  const [zone, setZone] = useState('');
  const [domMode, setDomMode] = useState<'marlen' | 'own'>('marlen');
  const [sub, setSub] = useState(slugify(salon).split('-')[0] || 'tucentro');
  const [own, setOwn] = useState('');
  const [domStatus, setDomStatus] = useState<'idle' | 'checking' | 'ok'>('idle');
  const [published, setPublished] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showPub, setShowPub] = useState(false);
  const [carIdx, setCarIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const tt = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [stockByTheme, setStockByTheme] = useState<Record<string, Photo[]>>({});
  const [stockLoading, setStockLoading] = useState(false);

  const say = (m: string) => { setToast(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(null), 3200); };
  /** Marca cambios sin publicar */
  const touch = () => { if (published) setDirty(true); };

  /* Pixabay: temática activa + temas de servicios del catálogo */
  useEffect(() => {
    if (view !== 'editor') return;
    const themes = new Set<string>([phTheme, 'centro', 'facial']);
    for (const s of svcs) themes.add(themeForService(s.name));
    let cancelled = false;
    const missing = [...themes].filter(t => !(stockByTheme[t]?.length));
    if (!missing.length) return;
    setStockLoading(true);
    void Promise.all(
      missing.map(theme =>
        searchStockByTheme({ theme, format: 'square', queryIndex: 0 }).then(r => {
          if (!r.ok || !r.configured) return null;
          return {
            theme,
            photos: r.photos.map(p => ({
              bg: `url("${stockProxyPath(p.srcUrl)}") center / cover no-repeat`,
              label: p.alt || p.photographer,
              theme,
            })),
          };
        }),
      ),
    ).then(rows => {
      if (cancelled) return;
      setStockLoading(false);
      setStockByTheme(s => {
        const next = { ...s };
        for (const row of rows) {
          if (row?.photos?.length && !next[row.theme]?.length) next[row.theme] = row.photos;
        }
        return next;
      });
    });
    return () => { cancelled = true; };
    // stockByTheme se lee para saltar temas ya cargados; no va en deps (evita bucle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, phTheme, svcs]);

  const bankPhotos = (theme: string): Photo[] => {
    const stock = stockByTheme[theme];
    if (stock?.length) return stock.slice(0, 6);
    return [0, 1, 2, 3, 4, 5].map(i => bankImg(theme, i));
  };
  const themeOfSvc = (s: Service) => themeForService(s.name);
  const T = tplOf(tplId), pals = palettesFor(T, brandColor), P = pals.find((p) => p.id === palId) || pals[1];
  const tabIdx = Math.max(0, TABS.findIndex((x) => x[0] === tab));
  const url = domMode === 'own' && domStatus === 'ok' ? own : `${sub || 'tu-centro'}.marlenapp.com`;
  const media: ServiceMedia = svcMedia || (T.svc === 'cards' ? 'photo' : 'none');
  const imgOf = (s: Service) => {
    if (svcImg[s.id]) return svcImg[s.id];
    const th = themeOfSvc(s);
    const stock = stockByTheme[th];
    if (stock?.[0]) return stock[0];
    const demo = SERVICE_MEDIA[s.id];
    return bankImg(demo ? demo[0] : th, demo ? demo[1] : 0);
  };
  const iconOf = (s: Service) => svcIcon[s.id] || ICONS[(SERVICE_MEDIA[s.id] || ['', 0, 0])[2] ?? 0]?.[1] || ICONS[0][1];
  const siteProps = {
    look: lookOf(T), pal: P, txt, sec, fx, svcMedia: media, iconStyle, salon, logo,
    bookingUrl: bookingUrl || undefined,
    phone,
    address,
    team: teamRows,
    svcs: svcs.map((s) => ({ ...s, img: imgOf(s).bg, icon: iconOf(s) })),
    photos: { hero: photos.hero, about: photos.about, team: photos.team.map((p) => (p ? p.bg : null)) },
  };

  const pickTpl = (id: string, open: boolean) => {
    const t = tplOf(id);
    setTplId(id); setPalId(t.pals[0].id);
    if (!txtManual) { setTone(t.tone); setTxtIdx(0); setTxt({ ...TEXTS[t.tone][0] }); }
    if (open) { setView('editor'); setTab('look'); setTool(null); }
    touch();
  };
  const publish = () => { setPublished(true); setDirty(false); setShowPub(true); setTool(null); };
  const copy = async (text: string, msg = 'Copiado') => { try { await navigator.clipboard.writeText(text); } catch { /* sin permiso */ } say(msg); };
  const setSvcFlag = (id: string, key: 'pub' | 'nov' | 'book') => {
    const s = svcs.find((x) => x.id === id)!;
    if (key === 'nov' && !s.pub) { say('Primero hazlo visible en la web'); return; }
    setSvcs(svcs.map((x) => (x.id !== id ? x : key === 'pub' && x.pub ? { ...x, pub: false, nov: false } : { ...x, [key]: !x[key] })));
    touch();
  };
  const checkDns = () => { if (domStatus === 'checking') return; setDomStatus('checking'); setTimeout(() => { setDomStatus('ok'); touch(); say('Dominio conectado'); }, 1800); }; // TODO(backend): verificación DNS real

  // subdominio
  const subShort = sub.length < 3, subDash = /^-|-$/.test(sub), subRes = RESERVED.includes(sub), subTaken = TAKEN_DEMO.includes(sub);
  const subOk = !subShort && !subDash && !subRes && !subTaken;
  const subMsg = subShort ? 'Usa al menos 3 letras o números' : subDash ? 'No puede empezar ni acabar en guion' : subRes ? `«${sub}» está reservado. Prueba con el nombre de tu centro` : subTaken ? `${sub}.marlenapp.com ya está ocupado. Prueba ${sub}-madrid` : `✓ ${sub}.marlenapp.com está disponible`;

  const statusDot = published ? (dirty ? MAGENTA : GREEN) : '#C9C8D3';
  const statusLabel = published ? (dirty ? 'Cambios sin publicar' : 'Publicada · ' + url) : 'Borrador · sin publicar';

  /* ---------------- paneles ---------------- */
  const panelLook = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px 12px' }}>
        {TEMPLATES.map((tp) => { const on = tp.id === tplId, pp = on ? P : palettesFor(tp, brandColor)[1]; return (
          <button key={tp.id} type="button" onClick={() => pickTpl(tp.id, false)} style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, color: INK, minWidth: 0 }}>
            <div style={{ padding: 3, borderRadius: 14, border: `2px solid ${on ? INK : 'transparent'}` }}>
              <div style={{ height: 124, borderRadius: 9, overflow: 'hidden', background: pp.bg, boxShadow: `0 0 0 1px ${LINE}` }}>
                <div style={{ zoom: 0.125, width: 1280, pointerEvents: 'none' }}><WebSite look={lookOf(tp)} pal={pp} txt={txt} salon={salon} logo={logo} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 4 }}><span style={{ fontSize: 14, fontWeight: on ? 700 : 600 }}>{tp.name}</span><span style={{ fontSize: 12, color: MUTED }}>{tp.desc}</span></div>
          </button>
        ); })}
      </div>
      <H>Colores</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pals.map((p) => { const on = p.id === P.id; return (
          <button key={p.id} type="button" onClick={() => { setPalId(p.id); touch(); }} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 68, padding: '0 14px', borderRadius: 16, border: `1.5px solid ${on ? INK : LINE}`, background: '#fff', color: INK, textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ display: 'flex', flexShrink: 0 }}>{[p.bg, p.surface, p.accent, p.ink].map((c, i) => <span key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, boxShadow: '0 0 0 2px #fff, 0 0 0 3px rgba(15,14,26,.1)', marginRight: -6 }} />)}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0, marginLeft: 10 }}><span style={{ fontSize: 15, fontWeight: 600 }}>{p.label}</span><span style={{ fontSize: 12, color: MUTED }}>{p.sub}</span></span>
            {on && <Icon d={P_CHECK} size={20} stroke={2.4} />}
          </button>
        ); })}
      </div>
      <H>Secciones</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SECTIONS.map(([k, label, desc]) => (
          <button key={k} type="button" onClick={() => { setSec({ ...sec, [k]: !sec[k] }); touch(); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, padding: '0 14px', borderRadius: 12, border: `1px solid ${BORDER}`, background: '#fff', color: INK, textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span><span style={{ fontSize: 12, color: MUTED }}>{desc}</span></span><Switch on={sec[k]} w={40} />
          </button>
        ))}
      </div>
    </>
  );

  const curPhoto = phTarget !== 'team' ? photos[phTarget] : null;
  const setPhoto = (k: 'hero' | 'about', v: Photo | null) => { setPhotos({ ...photos, [k]: v }); touch(); };
  const panelPhoto = (
    <>
      <H sub="Decídelo primero: cambia cómo se ve toda la lista de servicios.">Tus servicios, ¿con fotos o con iconos?</H>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {([['photo', 'Fotos', 'Más visual'], ['icon', 'Iconos', 'Limpio y uniforme'], ['none', 'Sin imagen', 'Estilo carta']] as [ServiceMedia, string, string][]).map(([k, label, desc]) => { const on = media === k; return (
          <button key={k} type="button" aria-pressed={on} onClick={() => { setSvcMedia(k); setMediaOpen(null); touch(); }} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 14, border: `2px solid ${on ? GREEN : LINE}`, background: '#fff', color: INK, textAlign: 'left', cursor: 'pointer', minWidth: 0 }}>
            <span style={{ height: 62, borderRadius: 9, background: CANVAS, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '0 8px' }}>
              {['#D9B8A6', '#B8C7B5', '#C9B9D6'].map((c) => (
                <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {k === 'photo' && <span style={{ width: 14, height: 14, borderRadius: 4, background: c, flexShrink: 0 }} />}
                  {k === 'icon' && <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1.6px solid ${INK}`, flexShrink: 0 }} />}
                  <span style={{ flex: 1, height: 4, borderRadius: 2, background: '#D9D8E0' }} />
                </span>
              ))}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}><span style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</span><span style={{ fontSize: 11, color: MUTED, lineHeight: 1.3 }}>{desc}</span></span>
            {on && <span style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: GREEN, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={P_CHECK} size={11} stroke={3.4} /></span>}
          </button>
        ); })}
      </div>
      {media === 'icon' && (
        <>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Estilo de los iconos</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {([['line', 'Línea', SOFT, INK, 12], ['solid', 'Relleno', INK, '#fff', '50%'], ['plain', 'Sin fondo', 'transparent', INK, 12]] as [IconStyle, string, string, string, number | string][]).map(([k, label, bg, c, rr]) => (
              <button key={k} type="button" onClick={() => { setIconStyle(k); touch(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 6px 10px', borderRadius: 14, border: `2px solid ${iconStyle === k ? GREEN : LINE}`, background: '#fff', color: INK, cursor: 'pointer' }}>
                <span style={{ width: 44, height: 44, borderRadius: rr, background: bg, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={ICONS[0][1]} size={22} stroke={1.7} /></span>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {media !== 'none' ? (
        <>
          <H sub={media === 'icon' ? 'Marlén ha elegido uno para cada servicio. Toca para cambiarlo.' : 'Marlén ha elegido una del banco para cada uno. Toca para cambiarla o subir la tuya.'}>{media === 'icon' ? 'Icono de cada servicio' : 'Foto de cada servicio'}</H>
          {svcs.filter((s) => s.pub).map((s) => { const open = mediaOpen === s.id, th = themeOfSvc(s), cur = imgOf(s), ic = iconOf(s); return (
            <div key={s.id} style={{ borderRadius: 14, border: `1.5px solid ${open ? INK : LINE}`, background: '#fff' }}>
              <button type="button" onClick={() => { setMediaOpen(open ? null : s.id); setPhTheme(th); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '8px 12px', border: 'none', background: 'none', color: INK, textAlign: 'left', cursor: 'pointer' }}>
                {media === 'photo' ? <span style={{ width: 44, height: 44, borderRadius: 10, background: cur.bg, flexShrink: 0 }} /> : <span style={{ width: 44, height: 44, borderRadius: 12, background: SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon d={ic} size={22} stroke={1.7} /></span>}
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4957' }}>{open ? 'Cerrar' : 'Cambiar'}</span>
              </button>
              {open && (
                <div style={{ padding: '0 12px 12px' }}>
                  {media === 'photo' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                      <label style={{ aspectRatio: '1', borderRadius: 10, border: '1.5px dashed #C9C8D3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 10.5, fontWeight: 600, color: '#4A4957', cursor: 'pointer' }}>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const v = fileToPhoto(e); if (v) { setSvcImg({ ...svcImg, [s.id]: v }); touch(); } }} /><Icon d={P_UP} size={18} stroke={2} />Subir
                      </label>
                      {bankPhotos(th).map((im, i) => <button key={i} type="button" title={im.label || ''} onClick={() => { setSvcImg({ ...svcImg, [s.id]: im }); touch(); }} style={{ padding: 2, borderRadius: 12, border: `2.5px solid ${im.bg === cur.bg ? INK : 'transparent'}`, background: 'none', cursor: 'pointer' }}><span style={{ display: 'block', aspectRatio: '1', borderRadius: 8, background: im.bg }} /></button>)}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
                      {ICONS.map(([label, d]) => <button key={label} type="button" title={label} onClick={() => { setSvcIcon({ ...svcIcon, [s.id]: d }); touch(); }} style={{ aspectRatio: '1', borderRadius: 12, border: `2px solid ${d === ic ? INK : 'transparent'}`, background: CANVAS, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon d={d} size={22} stroke={1.7} /></button>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ); })}
        </>
      ) : <span style={{ fontSize: 12, color: MUTED }}>Tus servicios se mostrarán solo con nombre, descripción y precio.</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: `1px solid ${LINE}` }}>
        <H sub="Portada, sobre nosotros y equipo.">Fotos de la web</H>
        <Seg items={[['hero', 'Portada'], ['about', 'Sobre nosotros'], ['team', 'Equipo']]} value={phTarget} onChange={setPhTarget} />
        {phTarget !== 'team' ? (
          <>
            <div style={{ position: 'relative', height: 150, borderRadius: 14, background: curPhoto ? curPhoto.bg : `linear-gradient(135deg, ${P.surface} 0%, ${P.accent} 100%)` }}>
              <span style={{ position: 'absolute', left: 10, bottom: 10, height: 26, padding: '0 10px', borderRadius: 999, background: 'rgba(15,14,26,.55)', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center' }}>{curPhoto ? (curPhoto.mine ? 'Tu foto' : `${curPhoto.theme} · ${curPhoto.label}`) : 'Elegida por Marlén según tu look'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Upload onFile={(e) => { const v = fileToPhoto(e); if (v) { setPhoto(phTarget as 'hero' | 'about', v); say('Foto subida'); } }} />
              {curPhoto && <button type="button" onClick={() => setPhoto(phTarget as 'hero' | 'about', null)} style={{ ...btn(), height: 40, fontSize: 13 }}>Que elija Marlén</button>}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4957' }}>O elige del banco de imágenes</span>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {BANK.map(([id, label]) => { const on = phTheme === id; return <button key={id} type="button" onClick={() => setPhTheme(id)} style={{ height: 34, padding: '0 12px', borderRadius: 999, border: `1px solid ${on ? INK : BORDER}`, background: on ? INK : '#fff', color: on ? '#fff' : INK, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' }}>{label}</button>; })}
            </div>
            {stockLoading && <span style={{ fontSize: 12, color: MUTED }}>Buscando fotos…</span>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {bankPhotos(phTheme).map((im, i) => (
                <button key={i} type="button" title={im.label || ''} onClick={() => setPhoto(phTarget as 'hero' | 'about', im)} style={{ padding: 2, borderRadius: 12, border: `2.5px solid ${curPhoto?.bg === im.bg ? INK : 'transparent'}`, background: 'none', cursor: 'pointer' }}>
                  <span style={{ display: 'block', aspectRatio: '4 / 3', borderRadius: 8, background: im.bg }} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {teamRows.map(([name], i) => { const p = photos.team[i]; return (
              <div key={name + i} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '6px 2px', borderBottom: `1px solid ${SOFT}` }}>
                <span style={{ width: 48, height: 48, borderRadius: '50%', background: p ? p.bg : LINE, flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span><span style={{ fontSize: 12, color: p ? GREEN : MUTED }}>{p ? 'Tu foto' : 'Sin foto'}</span></span>
                <Upload label={p ? 'Cambiar' : 'Subir foto'} onFile={(e) => { const v = fileToPhoto(e); if (v) { const tm = photos.team.slice(); tm[i] = v; setPhotos({ ...photos, team: tm }); touch(); } }} />
              </div>
            ); })}
            <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.45 }}>Para el equipo mejor fotos reales. Sin foto se muestra un fondo con el color de tu web.</span>
          </>
        )}
      </div>
    </>
  );

  const panelText = (
    <>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4957' }}>Tono</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {([['cercano', 'Cercano'], ['directo', 'Directo'], ['premium', 'Premium']] as [Tone, string][]).map(([id, label]) => { const on = tone === id; return (
          <button key={id} type="button" onClick={() => { setTone(id); setTxtIdx(0); setTxt({ ...TEXTS[id][0] }); setTxtManual(false); touch(); say('Textos en tono ' + label.toLowerCase()); }} style={{ flex: 1, height: 40, borderRadius: 999, border: `1px solid ${on ? INK : BORDER}`, background: on ? INK : '#fff', color: on ? '#fff' : INK, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
        ); })}
      </div>
      <button type="button" onClick={() => { const i = (txtIdx + 1) % TEXTS[tone].length; setTxtIdx(i); setTxt({ ...TEXTS[tone][i] }); setTxtManual(false); touch(); say('Marlén ha reescrito los textos en tono ' + tone); }} style={{ ...btn(), height: 48, border: 'none', background: SOFT }}>
        <Icon d={ICONS[0][1]} size={17} stroke={1.9} color={MAGENTA} />Marlén, propón otra versión
      </button>
      {([['heroTitle', 'Titular'], ['heroSub', 'Subtítulo'], ['aboutTitle', 'Título de «Sobre nosotros»'], ['aboutText', 'Texto de «Sobre nosotros»'], ['cta', 'Botón de reserva']] as [keyof SiteTexts, string][]).map(([k, label]) => {
        const v = txt[k], max = TEXT_LIMITS[k], area = k === 'aboutText' || k === 'heroSub';
        const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setTxt({ ...txt, [k]: e.target.value }); setTxtManual(true); touch(); };
        return (
          <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, fontWeight: 600, color: '#4A4957' }}>{label}<span style={{ fontSize: 11, fontWeight: 500, color: v.length > max ? '#B42318' : MUTED }}>{v.length}/{max}</span></span>
            {area ? <textarea value={v} onChange={onChange} rows={4} style={{ ...input(mob), height: 'auto', padding: '12px 14px', lineHeight: 1.5, resize: 'none' }} /> : <input value={v} onChange={onChange} style={input(mob)} />}
          </label>
        );
      })}
      <span style={{ fontSize: 12, lineHeight: 1.45, color: MUTED }}>Servicios, precios, equipo y horarios salen de tu cuenta de Marlenapp y se actualizan solos.</span>
    </>
  );

  const panelSvc = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {svcs.map((s) => { const open = svcOpen === s.id;
        const G = { background: '#E8F4EE', color: '#16683F' }, O = { background: SOFT, color: '#5E5D6B' };
        const tags: [string, React.CSSProperties][] = [[s.pub ? 'Visible en web' : 'Oculto en web', s.pub ? G : O], ...(s.nov ? [['Nuevo', G] as [string, React.CSSProperties]] : []), [s.book ? 'Reserva online' : 'Sin reserva online', s.book ? G : O]];
        return (
          <div key={s.id} style={{ borderRadius: 14, border: `1.5px solid ${open ? INK : LINE}`, background: '#fff' }}>
            <button type="button" onClick={() => setSvcOpen(open ? null : s.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 64, padding: '10px 14px', border: 'none', background: 'none', color: INK, textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{tags.map(([l, st]) => <span key={l} style={{ height: 22, padding: '0 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', ...st }}>{l}</span>)}</span>
              </span>
              <Icon d="M6 9l6 6 6-6" size={18} stroke={2} color={MUTED} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
            {open && (
              <div style={{ padding: '0 14px 6px', borderTop: `1px solid ${SOFT}` }}>
                {([['pub', 'Visible en web', 'Aparece en la lista de servicios de tu web'], ['nov', 'Novedad', 'Sale destacado arriba, con la etiqueta «Nuevo»'], ['book', 'Reserva online', 'Se puede reservar en tu calendario público']] as ['pub' | 'nov' | 'book', string, string][]).map(([k, label, desc]) => { const dis = k === 'nov' && !s.pub; return (
                  <button key={k} type="button" onClick={() => setSvcFlag(s.id, k)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '6px 0', border: 'none', borderBottom: `1px solid ${CANVAS}`, background: 'none', color: INK, textAlign: 'left', cursor: 'pointer', opacity: dis ? 0.5 : 1 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span><span style={{ fontSize: 12, color: MUTED, lineHeight: 1.35 }}>{dis ? 'Primero hazlo visible en la web' : desc}</span></span>
                    <Switch on={s[k]} disabled={dis} />
                  </button>
                ); })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const fxField = (name: keyof Extras, label: string, ph: string) => {
    const v = String(fx[name] || '').trim(); let hint = '', hc = MUTED;
    if (name === 'gUrl') { const ok = /(google\.|g\.page|goo\.gl|maps\.app)/i.test(v); hint = ok ? '✓ Ficha encontrada · reseñas importadas' : v ? 'Pega el enlace de «Compartir» de tu ficha de Google' : 'Lo encuentras en Google Maps › tu centro › Compartir'; hc = ok ? GREEN : MUTED; }
    if (name === 'igUser') { const u = v.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/[/?].*$/, '').replace(/^@/, ''); const ok = /^[a-z0-9._]{2,30}$/i.test(u); hint = ok ? `✓ Conectado a @${u} · 6 últimas publicaciones` : 'Escribe tu usuario, por ejemplo @tucentro'; hc = ok ? GREEN : '#B42318'; }
    return (
      <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#4A4957' }}>{label}</span>
        <input value={String(fx[name] || '')} placeholder={ph} onChange={(e) => { setFx({ ...fx, [name]: e.target.value }); touch(); }} style={{ ...input(mob), borderRadius: 10, padding: '0 12px' }} />
        {hint && <span style={{ fontSize: 12, fontWeight: 600, color: hc, lineHeight: 1.4 }}>{hint}</span>}
      </label>
    );
  };
  const panelFx = (
    <>
      <H sub="Tu calendario público, conectado a tu agenda.">Reserva online</H>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {([['float', 'Botón flotante', 'Siempre visible al hacer scroll'], ['embed', 'Incrustado', 'Calendario dentro de la web'], ['both', 'Los dos', 'Máxima visibilidad'], ['off', 'No mostrar', 'Solo el botón del menú']] as [BookingMode, string, string][]).map(([id, label, desc]) => (
          <button key={id} type="button" onClick={() => { setFx({ ...fx, book: id }); touch(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${fx.book === id ? INK : LINE}`, background: '#fff', color: INK, textAlign: 'left', cursor: 'pointer' }}><span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span><span style={{ fontSize: 12, color: MUTED, lineHeight: 1.35 }}>{desc}</span></button>
        ))}
      </div>
      <H>Más funciones</H>
      {([
        ['wa', 'WhatsApp directo', 'Botón flotante que abre un chat contigo', 'M4 20l1.4-4.2A8 8 0 1 1 8.4 19z', [['waNum', 'Número de WhatsApp', '600 000 000'], ['waMsg', 'Mensaje que se escribe solo', '']]],
        ['bar', 'Barra de aviso', 'Una promo o novedad arriba del todo', 'M4 6h16v5H4zM7 15h10M9 19h6', [['barText', 'Texto de la barra', '']]],
        ['reviews', 'Reseñas de Google', 'Se importan de tu ficha y se actualizan solas', ICONS[9][1], [['gUrl', 'Enlace de tu ficha de Google', 'https://g.page/r/…']]],
        ['gift', 'Tarjetas regalo', 'Venta online; se canjean en tu agenda', 'M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8C10 4 6 4 6 6.5S9 8 12 8zM12 8c2-4 6-4 6-1.5S15 8 12 8z', []],
        ['insta', 'Instagram', 'Tus 6 últimas publicaciones', 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M17 7h.01', [['igUser', 'Usuario o enlace de Instagram', '@tucentro']]],
      ] as [keyof Extras, string, string, string, [keyof Extras, string, string][]][]).map(([k, label, desc, d, fields]) => { const on = !!fx[k]; return (
        <div key={k} style={{ borderRadius: 14, border: `1.5px solid ${on ? INK : LINE}`, background: '#fff' }}>
          <button type="button" onClick={() => { setFx({ ...fx, [k]: !on }); touch(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '10px 14px', border: 'none', background: 'none', color: INK, textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: on ? INK : SOFT, color: on ? '#fff' : INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon d={d} size={19} /></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span><span style={{ fontSize: 12, color: MUTED, lineHeight: 1.35 }}>{desc}</span></span>
            <Switch on={on} w={40} />
          </button>
          {on && fields.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 14px 14px 62px' }}>{fields.map(([n, l, ph]) => fxField(n, l, ph))}</div>}
        </div>
      ); })}
      <H>Incluido siempre</H>
      {[['Aviso de cookies y textos legales', 'Aviso legal y privacidad (RGPD) generados con los datos de tu centro'], ['Google y buscadores', 'Automático: lo ves en el paso Dominio'], ['Estadísticas de visitas', 'Cuántas personas ven tu web y cuántas reservan']].map(([l, d]) => (
        <div key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 2px' }}><Icon d={P_CHECK} size={18} stroke={2.4} color={GREEN} style={{ marginTop: 1 }} /><span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{l}</span><span style={{ fontSize: 12, color: MUTED, lineHeight: 1.35 }}>{d}</span></span></div>
      ))}
    </>
  );

  const z = zone.trim() || 'tu zona';
  const seoTitle = `${salon} | Centro de estética en ${z}`;
  const seoDesc = `Limpieza facial, lifting de pestañas, manicura y masajes en ${z}. Precios, horario y reserva online las 24 h.`;
  const radio = (on: boolean) => <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${on ? INK : '#C9C8D3'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: on ? INK : 'transparent' }} /></span>;
  const panelDom = (
    <>
      <div style={{ borderRadius: 16, border: `1.5px solid ${domMode === 'marlen' ? INK : LINE}` }}>
        <button type="button" onClick={() => { setDomMode('marlen'); touch(); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: 16, border: 'none', background: 'none', textAlign: 'left', color: INK, cursor: 'pointer' }}>
          {radio(domMode === 'marlen')}<span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 15, fontWeight: 700 }}>Dominio gratis de Marlén</span><span style={{ fontSize: 13, color: MUTED }}>Listo al momento, con https. Incluido en tu plan.</span></span>
        </button>
        {domMode === 'marlen' && (
          <div style={{ padding: '0 16px 16px 50px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', height: mob ? 48 : 44, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <input value={sub} aria-label="Nombre de tu web" onChange={(e) => { setSub(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30)); touch(); }} style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', padding: '0 0 0 14px', fontSize: mob ? 15 : 14, fontWeight: 600, outline: 'none', fontFamily: 'inherit' }} />
              <span style={{ height: '100%', padding: '0 14px', display: 'flex', alignItems: 'center', background: CANVAS, borderLeft: `1px solid ${BORDER}`, fontSize: mob ? 15 : 14, color: '#4A4957' }}>.marlenapp.com</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: subOk ? GREEN : '#B42318' }}>{subMsg}</span>
          </div>
        )}
      </div>
      <div style={{ borderRadius: 16, border: `1.5px solid ${domMode === 'own' ? INK : LINE}` }}>
        <button type="button" onClick={() => { setDomMode('own'); touch(); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: 16, border: 'none', background: 'none', textAlign: 'left', color: INK, cursor: 'pointer' }}>
          {radio(domMode === 'own')}<span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 15, fontWeight: 700 }}>Tu propio dominio</span><span style={{ fontSize: 13, color: MUTED }}>Conecta uno que ya tengas, como arlettbeauty.com.</span></span>
        </button>
        {domMode === 'own' && (
          <div style={{ padding: '0 16px 16px 50px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input value={own} placeholder="tudominio.com" onChange={(e) => { setOwn(e.target.value.toLowerCase().replace(/\s/g, '')); setDomStatus('idle'); }} style={{ ...input(mob), fontWeight: 600 }} />
            <div><div style={{ fontSize: 13, fontWeight: 700 }}>1 · Entra en tu proveedor de dominio</div><div style={{ fontSize: 12, color: MUTED }}>IONOS, GoDaddy, Dondominio, Hostinger…, en la sección DNS.</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>2 · Añade estos dos registros</span>
              {DNS_RECORDS.map(([type, name, value]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 10px 12px', borderRadius: 12, background: CANVAS }}>
                  <span style={{ width: 54, fontSize: 12, fontWeight: 700 }}>{type}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}><span style={{ fontSize: 11, color: MUTED }}>Nombre {name}</span><span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'ui-monospace, Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span></span>
                  <button type="button" onClick={() => copy(value, 'Valor copiado')} style={{ ...btn(), height: 34, padding: '0 12px', fontSize: 12 }}>Copiar</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>3 · Comprueba la conexión</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={checkDns} style={{ ...btn(), height: 40, border: `1.5px solid ${INK}`, fontSize: 13 }}>{domStatus === 'checking' ? 'Comprobando…' : domStatus === 'ok' ? 'Volver a comprobar' : 'Comprobar conexión'}</button>
                <span style={{ fontSize: 13, fontWeight: 600, color: { idle: MUTED, checking: '#B26A00', ok: GREEN }[domStatus] }}>● {{ idle: 'Sin conectar', checking: 'Buscando tus registros…', ok: 'Conectado · https activo' }[domStatus]}</span>
              </div>
              <span style={{ fontSize: 12, color: MUTED }}>Los cambios de DNS pueden tardar hasta 24 h. Mientras, tu web funciona en {sub}.marlenapp.com.</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: `1px solid ${LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Así te verán en Google</span>
          <span style={{ height: 26, padding: '0 10px', borderRadius: 999, background: '#E8F4EE', color: GREEN, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Icon d={P_CHECK} size={13} stroke={2.6} />Automático</span>
        </div>
        <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ fontSize: 13, color: '#202124' }}>{salon}</span><span style={{ fontSize: 12, color: '#4D5156' }}>https://{url}</span></span>
          </div>
          <span style={{ fontSize: 18, lineHeight: 1.3, color: '#1A0DAB' }}>{seoTitle}</span>
          <span style={{ fontSize: 13, lineHeight: 1.5, color: '#4D5156' }}>{seoDesc}</span>
          <span style={{ fontSize: 13, color: '#4D5156' }}><span style={{ color: '#E7711B' }}>★★★★★</span> 4,9 (128) · Centro de estética · {z}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>{['Servicios y precios', 'Reservar cita', 'Equipo', 'Cómo llegar'].map((l) => <span key={l} style={{ fontSize: 13, color: '#1A0DAB' }}>{l}</span>)}</div>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4957' }}>Zona donde te buscan</span>
          <input value={zone} placeholder="Barrio o ciudad" onChange={(e) => { setZone(e.target.value.slice(0, 30)); touch(); }} style={input(mob)} />
          <span style={{ fontSize: 12, color: MUTED }}>Marlén la usa en títulos y páginas: «Limpieza facial en {z}».</span>
        </label>
        {/* TODO(backend): generar páginas por servicio, schema.org LocalBusiness/BeautySalon, sitemap y envío a Search Console al publicar. */}
        {[['Una página por servicio', `Para salir cuando buscan «limpieza facial en ${z}»`, true], ['Datos de negocio local', 'Dirección, horario, precios y reseñas en el formato que entiende Google', true], ['Mapa del sitio', published ? 'Enviado a Google · hoy' : 'Se envía solo al publicar', published], ['Rápida y adaptada al móvil', 'Imágenes optimizadas y https incluido', true]].map(([l, d, ok]) => (
          <div key={String(l)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: ok ? '#E8F4EE' : SOFT, color: ok ? GREEN : MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon d={ok ? P_CHECK : 'M12 7v5l3 2'} size={12} stroke={3} /></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{l}</span><span style={{ fontSize: 12, color: MUTED }}>{d}</span></span>
          </div>
        ))}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{svcs.filter((s) => s.pub).slice(0, 6).map((s) => <span key={s.id} style={{ height: 28, padding: '0 10px', borderRadius: 8, background: CANVAS, fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace', color: '#4A4957', display: 'flex', alignItems: 'center' }}>/{slugify(s.name.split(' ').slice(0, 2).join(' '))}-{slugify(z)}</span>)}</div>
      </div>
    </>
  );
  const PANELS: Record<TabId, React.ReactNode> = { look: panelLook, photo: panelPhoto, text: panelText, svc: panelSvc, fx: panelFx, dom: panelDom };

  /* ---------------- vista previa ---------------- */
  const narrowPreview = mob || device === 'mob';
  const fl = { r: narrowPreview ? 14 : 22, br: T.br === '0px' ? '0px' : T.br === '4px' ? '6px' : '999px' };
  const preview = (
    <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, background: CANVAS, padding: mob ? '0 12px 12px' : '18px 24px 24px' }}>
      {!mob && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ width: 240 }}><Seg items={[['desk', 'Ordenador'], ['mob', 'Móvil']]} value={device} onChange={setDevice} /></div>
          <span style={{ fontSize: 13, color: MUTED }}>Así la verán tus clientas</span>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: !mob && device === 'mob' ? 375 : '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: !mob && device === 'mob' ? 28 : mob ? 18 : 12, overflow: 'hidden', boxShadow: '0 24px 60px rgba(15,14,26,.14), 0 0 0 1px rgba(15,14,26,.06)' }}>
          <div style={{ height: mob ? 34 : 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px', background: SOFT, borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ height: 26, maxWidth: 420, minWidth: 0, padding: '0 14px', borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#4A4957' }}><Icon d={P_LOCK} size={12} stroke={2.2} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</span></span>
          </div>
          {/* La web se renderiza a su ancho real (1280 / 390) y se reduce con zoom para que la maqueta sea idéntica a la publicada. */}
          <PreviewScroll narrow={narrowPreview}><WebSite {...siteProps} narrow={narrowPreview} /></PreviewScroll>
          <div style={{ position: 'absolute', right: fl.r, bottom: fl.r, display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
            {(fx.book === 'float' || fx.book === 'both') && <span style={{ height: 44, padding: `0 ${narrowPreview ? 14 : 18}px`, borderRadius: fl.br, background: P.accent, color: P.onAccent, fontSize: narrowPreview ? 13 : 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', boxShadow: '0 10px 24px rgba(0,0,0,.22)' }}><Icon d="M6 5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM3 10h18M8 3v4M16 3v4" size={16} stroke={2} />{txt.cta}</span>}
            {fx.wa && <span style={{ width: 44, height: 44, borderRadius: '50%', background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(0,0,0,.22)' }}><Icon d="M4 20l1.4-4.2A8 8 0 1 1 8.4 19zM9.5 9.5c.3 1.8 1.7 3.4 3.5 4l1-1 1.5.8" size={22} stroke={2} /></span>}
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------------- vistas ---------------- */
  const hubTabs = (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: SOFT, borderRadius: 999, flex: mob ? 1 : undefined }}>
      <button type="button" onClick={onOpenCreatives} style={{ flex: mob ? 1 : undefined, height: mob ? 40 : 36, padding: '0 16px', border: 'none', borderRadius: 999, background: 'transparent', color: '#5E5D6B', fontSize: mob ? 14 : 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}>Creatividades</button>
      <button type="button" style={{ flex: mob ? 1 : undefined, height: mob ? 40 : 36, padding: '0 16px', border: 'none', borderRadius: 999, background: '#fff', color: INK, fontSize: mob ? 14 : 13, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(15,14,26,.14)' }}>Tu página web</button>
    </div>
  );
  const circle = (d: string, onClick?: () => void, label = 'Volver') => <button type="button" aria-label={label} onClick={onClick} style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: SOFT, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}><Icon d={d} size={20} stroke={2} /></button>;

  const intro = (
    <>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: mob ? 16 : 28, padding: mob ? '4px 0 12px' : '32px 0 40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', padding: mob ? '0 16px' : '0 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <MarlenAvatar size={mob ? 36 : 48} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <h2 style={{ margin: 0, fontSize: mob ? 17 : 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Te preparo tu página web</h2>
              <p style={{ margin: 0, fontSize: mob ? 13 : 14, lineHeight: 1.45, color: '#4A4957' }}>{mob ? 'Elige un look. Lo monto con tu catálogo y tu reserva.' : 'Elige un look y lo monto con tu catálogo, tu equipo y tu botón de reserva. Después cambias colores, textos y dominio.'}</p>
            </div>
          </div>
          {!mob && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {TABS.map(([, label], i) => <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: i === 0 ? INK : MUTED }}><span style={{ width: 24, height: 24, borderRadius: '50%', border: `1.5px solid ${i === 0 ? INK : '#C9C8D3'}`, background: i === 0 ? INK : '#fff', color: i === 0 ? '#fff' : MUTED, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>{label}</span>)}
            </div>
          )}
        </div>
        <div onScroll={(e) => { if (mob) setCarIdx(Math.max(0, Math.min(3, Math.round(e.currentTarget.scrollLeft / 264)))); }}
          style={mob ? { display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '6px 70px 10px', scrollbarWidth: 'none' } : { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20, padding: '0 40px' }}>
          {TEMPLATES.map((tp) => { const pp = palettesFor(tp, brandColor)[1], w = mob ? 250 : 318; return (
            <button key={tp.id} type="button" onClick={() => pickTpl(tp.id, true)} style={{ flexShrink: 0, scrollSnapAlign: 'center', width: mob ? w : '100%', border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, color: INK }}>
              <div style={{ position: 'relative', height: mob ? 400 : 430, borderRadius: 16, overflow: 'hidden', background: pp.bg, boxShadow: '0 18px 44px rgba(15,14,26,.14), 0 0 0 1px rgba(15,14,26,.06)' }}>
                <div style={{ zoom: mob ? w / 390 : w / 1280, width: mob ? 390 : 1280, pointerEvents: 'none' }}><WebSite look={lookOf(tp)} pal={pp} txt={txtManual ? txt : TEXTS[tp.tone][0]} narrow={mob} salon={salon} logo={logo} /></div>
                {tp.id === 'atelier' && <span style={{ position: 'absolute', top: 12, left: 12, height: 28, padding: '0 12px', borderRadius: 999, background: MAGENTA, color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>Mi favorita</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0 2px' }}><span style={{ fontSize: 17, fontWeight: 700 }}>{tp.name}</span><span style={{ fontSize: 13, color: MUTED }}>{tp.desc}</span></div>
            </button>
          ); })}
        </div>
        {mob ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>{TEMPLATES.map((x, i) => <span key={x.id} style={{ width: i === carIdx ? 22 : 8, height: 8, borderRadius: 4, background: i === carIdx ? INK : '#D9D8E0', transition: 'width .2s' }} />)}</div>
        ) : (
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', padding: '0 40px' }}>
            {[`Dominio gratis ${sub}.marlenapp.com`, 'Servicios y precios siempre al día', 'Botón de reserva conectado a tu agenda'].map((x) => <span key={x} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#4A4957' }}><Icon d={P_CHECK} size={16} stroke={2.4} />{x}</span>)}
          </div>
        )}
      </div>
      {mob && <div style={{ flexShrink: 0, padding: '12px 16px 24px', borderTop: `1px solid ${LINE}` }}><button type="button" onClick={() => pickTpl(TEMPLATES[carIdx].id, true)} style={{ ...btn(true), width: '100%', height: 56, fontSize: 16 }}>Me quedo con {TEMPLATES[carIdx].name}</button></div>}
    </>
  );

  const tip = <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}><MarlenAvatar size={24} /><span style={{ fontSize: 13, lineHeight: 1.45, color: '#4A4957' }}>{TIPS[tab]}</span></div>;
  const editor = mob ? (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {preview}
      {tool ? <div style={{ height: 430, flexShrink: 0 }} /> : (
        <div style={{ height: 96, flexShrink: 0, display: 'flex', gap: 2, padding: '8px 6px 26px', borderTop: `1px solid ${LINE}`, background: '#fff' }}>
          {TABS.map(([id, label, d]) => <button key={id} type="button" onClick={() => { setTab(id); setTool(id); }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', background: 'transparent', color: INK, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}><span style={{ width: 44, height: 34, borderRadius: 12, background: SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={d} size={22} /></span>{label}</button>)}
        </div>
      )}
      {tool && (
        <aside style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 430, zIndex: 10, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '24px 24px 0 0', boxShadow: '0 -12px 40px rgba(15,14,26,.14)' }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: '#D9D8E0', alignSelf: 'center', marginTop: 10 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px 20px' }}><span style={{ fontSize: 19, fontWeight: 700 }}>{TABS[tabIdx][1]}</span><button type="button" onClick={() => setTool(null)} style={btn(true)}>Listo</button></div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>{tip}{PANELS[tab]}</div>
        </aside>
      )}
    </div>
  ) : (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '400px minmax(0, 1fr)' }}>
      <aside style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: `1px solid ${LINE}` }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', gap: 2, padding: 3, background: SOFT, borderRadius: 11 }}>
            {TABS.map(([id, label]) => { const on = id === tab; return <button key={id} type="button" onClick={() => setTab(id)} style={{ flex: '1 1 auto', minWidth: 0, height: 38, padding: '0 4px', border: 'none', borderRadius: 8, background: on ? '#fff' : 'transparent', color: on ? INK : MUTED, boxShadow: on ? '0 1px 3px rgba(15,14,26,.12)' : 'none', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}>{label}</button>; })}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>{tip}{PANELS[tab]}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderTop: `1px solid ${LINE}` }}>
          {tabIdx > 0 && <button type="button" onClick={() => setTab(TABS[tabIdx - 1][0])} style={{ ...btn(), height: 40, border: 'none', color: '#4A4957', fontSize: 13 }}><Icon d={P_BACK} size={16} stroke={2} />{TABS[tabIdx - 1][1]}</button>}
          <span style={{ flex: 1 }} />
          {tabIdx < TABS.length - 1 ? <button type="button" onClick={() => setTab(TABS[tabIdx + 1][0])} style={{ ...btn(), height: 40, border: `1.5px solid ${INK}`, fontSize: 13 }}>Siguiente: {TABS[tabIdx + 1][1]}<Icon d={P_NEXT} size={16} stroke={2} /></button>
            : <button type="button" onClick={publish} style={{ ...btn(true), height: 40, fontSize: 13 }}>Todo listo · Publicar</button>}
        </div>
      </aside>
      {preview}
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, background: '#fff', color: INK, fontFamily: "var(--font-sora), 'Sora', system-ui, sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!mob ? (
        <header style={{ height: 72, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', borderBottom: `1px solid ${LINE}` }}>
          {circle(P_BACK, view === 'editor' ? () => setView('intro') : onBack)}
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Marketing</span>
          <div style={{ marginLeft: 8 }}>{hubTabs}</div>
          <span style={{ flex: 1 }} />
          {view === 'editor' && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, maxWidth: 320, minWidth: 0, padding: '0 14px', borderRadius: 999, background: CANVAS, fontSize: 13, fontWeight: 600, color: '#4A4957' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: statusDot, flexShrink: 0 }} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{statusLabel}</span></span>
              <button type="button" onClick={publish} style={btn(true)}><Icon d={TABS[5][2]} size={18} stroke={1.9} />{published ? 'Publicar cambios' : 'Publicar web'}</button>
            </>
          )}
        </header>
      ) : view === 'intro' ? (
        <div style={{ flexShrink: 0, padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{circle(P_BACK, onBack)}<span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em' }}>Marketing</span></div>
          {hubTabs}
        </div>
      ) : (
        <div style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
          {circle(P_BACK, () => { setView('intro'); setTool(null); })}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}><span style={{ fontSize: 16, fontWeight: 700 }}>Tu página web</span><span style={{ fontSize: 12, color: MUTED, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot, flexShrink: 0 }} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{statusLabel}</span></span></div>
          <button type="button" onClick={publish} style={{ ...btn(true), fontSize: 15 }}>Publicar</button>
        </div>
      )}
      {view === 'intro' ? intro : editor}

      {showPub && (
        <div onClick={() => setShowPub(false)} style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(15,14,26,.42)', display: 'flex', alignItems: mob ? 'flex-end' : 'center', justifyContent: 'center', padding: mob ? 0 : 40 }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: 540, background: '#fff', borderRadius: mob ? '24px 24px 0 0' : 24, padding: mob ? '20px 20px 28px' : 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 30px 80px rgba(15,14,26,.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><MarlenAvatar size={48} /><div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 21, fontWeight: 700 }}>Tu web ya está publicada</span><span style={{ fontSize: 14, color: '#4A4957' }}>La he dejado lista con tu catálogo, tu equipo y tu botón de reserva.</span></div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 12px 16px', borderRadius: 14, background: CANVAS }}>
              <Icon d={P_LOCK} size={16} stroke={2.2} color={GREEN} /><span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
              <button type="button" onClick={() => copy('https://' + url, 'Enlace copiado')} style={{ ...btn(), height: 36, fontSize: 13 }}>Copiar</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent('https://' + url), '_blank')} style={btn()}>WhatsApp</button>
              <button type="button" onClick={() => copy('https://' + url, 'Enlace copiado para tu bio')} style={btn()}>Bio de Instagram</button>
              <button type="button" onClick={() => copy('https://' + url, 'Enlace copiado para tu firma')} style={btn()}>Firma de email</button>
            </div>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: MUTED }}>Ya la he enviado a Google. Si cambias un servicio, un precio o un horario en Marlenapp, tu web y lo que ve Google se actualizan solos.</span>
            <button type="button" onClick={() => setShowPub(false)} style={{ ...btn(true), height: 48 }}>Seguir editando</button>
          </div>
        </div>
      )}
      {toast && <div role="status" style={{ position: 'absolute', left: 16, right: 16, bottom: mob ? (tool ? 446 : 108) : 28, margin: '0 auto', width: 'fit-content', maxWidth: 'calc(100% - 32px)', background: INK, color: '#fff', padding: '12px 16px', borderRadius: 14, fontSize: 14, fontWeight: 500, boxShadow: '0 12px 32px rgba(15,14,26,.24)', zIndex: 40 }}>{toast}</div>}
    </div>
  );
}

/** Scroll de la vista previa: mide el ancho y aplica zoom para pintar la web a 1280 px (o 390 px en móvil) */
function PreviewScroll({ narrow, children }: { narrow: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); return () => ro.disconnect(); }, []);
  const base = narrow ? 390 : 1280;
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ zoom: w ? w / base : 0.75, width: base }}>{children}</div>
    </div>
  );
}
