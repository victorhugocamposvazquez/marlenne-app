'use client';

import { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';

export type DrawerKind = 'profile' | 'security' | 'notifPrefs' | 'sessions';

const TITLES: Record<DrawerKind, string> = {
  profile: 'Mi perfil',
  security: 'Seguridad',
  notifPrefs: 'Notificaciones',
  sessions: 'Sesiones activas',
};

const NOTIF_LABELS = [
  'Cobros fallidos',
  'Servicios degradados o caídos',
  'Alguien entra en modo soporte',
  'Nuevas altas y bajas',
  'Resumen diario a las 8:00',
];

const DEFAULT_PREFS: [boolean, boolean][] = [
  [true, true],
  [true, true],
  [true, false],
  [true, false],
  [true, false],
];

export default function MiCuentaDrawer({
  kind,
  onClose,
  onBack,
  onToast,
}: {
  kind: DrawerKind;
  onClose: () => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [killedSession, setKilledSession] = useState(false);
  const hasSave = kind === 'profile' || kind === 'notifPrefs';

  const togglePref = (i: number, j: 0 | 1) => {
    setPrefs(prev => prev.map((row, ri) => (ri === i ? (j === 0 ? [!row[0], row[1]] : [row[0], !row[1]]) : row)) as typeof prev);
  };

  const save = () => {
    onToast(kind === 'profile' ? 'Perfil guardado' : 'Preferencias guardadas');
    onBack();
  };

  return (
    <>
      <button type="button" aria-label="Cerrar panel" onClick={onClose} className="fixed inset-0 z-[18] bg-[rgba(15,14,26,.25)]" />
      <aside className="fixed inset-y-0 right-0 z-[19] flex w-full max-w-[420px] flex-col bg-white shadow-[-20px_0_60px_rgba(15,14,26,.16)]">
        <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4">
          <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-pill bg-[#F2F2F7]">
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-ink-3">Mi cuenta</p>
            <p className="truncate text-[17px] font-bold tracking-tight">{TITLES[kind]}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-pill bg-[#F2F2F7]">
            <X size={16} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto p-5 pb-6">
          {kind === 'profile' && (
            <>
              <div className="flex items-center gap-3.5">
                <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-ink text-[20px] font-bold text-white">HC</span>
                <button type="button" onClick={() => onToast('Elegir foto')} className="h-[38px] rounded-pill border-[1.5px] border-line bg-white px-3.5 text-[13px] font-semibold">
                  Cambiar foto
                </button>
              </div>
              {[
                ['Nombre', 'Hugo Campos'],
                ['Correo', 'hugo@marlen.app'],
                ['Móvil (para códigos)', '+34 612 40 22 18'],
                ['Idioma', 'Español'],
                ['Zona horaria', 'Europe/Madrid'],
              ].map(([label, value]) => (
                <label key={label} className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-ink-2">{label}</span>
                  <input defaultValue={value} className="h-[50px] rounded-[14px] border-none bg-page px-3.5 text-[15px] font-semibold outline-none" />
                </label>
              ))}
            </>
          )}

          {kind === 'security' && (
            <>
              <div className="flex flex-col rounded-card bg-page px-4 py-1">
                {[
                  ['Contraseña', 'Cambiada hace 42 días', 'Cambiar'],
                  ['Verificación en dos pasos', 'Activa · app de autenticación', 'Códigos de respaldo'],
                  ['Llave de seguridad', 'Ninguna', 'Añadir'],
                  ['Cerrar sesión en todos los dispositivos', 'Incluye este', 'Cerrar todo'],
                ].map(([k, v, a], i) => (
                  <div key={k} className={`flex items-center gap-3 py-3.5 ${i ? 'border-t border-line' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">{k}</p>
                      <p className="text-[13px] text-ink-2">{v}</p>
                    </div>
                    {a && (
                      <button type="button" onClick={() => onToast(a)} className="h-[34px] shrink-0 rounded-pill border-[1.5px] border-line bg-white px-3 text-[12px] font-semibold">
                        {a}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[15px] font-bold">Accesos recientes</p>
                {[
                  ['Hoy 8:02', 'Chrome · MacBook · Madrid'],
                  ['Ayer 18:40', 'Safari · iPhone · Madrid'],
                  ['19 sep', 'Chrome · MacBook · Madrid'],
                  ['15 sep', 'Intento fallido · contraseña incorrecta · Madrid'],
                ].map(([when, what]) => (
                  <div key={when} className="flex items-center gap-3 border-t border-line py-2.5">
                    <span className="w-16 text-[12px] text-ink-3">{when}</span>
                    <span className="flex-1 text-[13px]">{what}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {kind === 'notifPrefs' && (
            <>
              <p className="text-[13px] leading-relaxed text-ink-2">
                Elige por dónde quieres cada aviso. Los críticos (servicios caídos) siempre llegan al móvil.
              </p>
              <div className="flex flex-col rounded-card bg-page px-4 py-1">
                <div className="grid grid-cols-[1fr_56px_56px] gap-2 pb-1.5 pt-2.5">
                  <span />
                  <span className="text-center text-[11px] font-semibold text-ink-3">Correo</span>
                  <span className="text-center text-[11px] font-semibold text-ink-3">Móvil</span>
                </div>
                {NOTIF_LABELS.map((label, i) => (
                  <div key={label} className="grid grid-cols-[1fr_56px_56px] items-center gap-2 border-t border-[#E6E5EC] py-3">
                    <span className="text-[14px]">{label}</span>
                    <button type="button" onClick={() => togglePref(i, 0)} className={`mx-auto h-6 w-6 rounded-[7px] ${prefs[i][0] ? 'bg-ink' : 'bg-[#D9D8E0]'}`} />
                    <button type="button" onClick={() => togglePref(i, 1)} className={`mx-auto h-6 w-6 rounded-[7px] ${prefs[i][1] ? 'bg-ink' : 'bg-[#D9D8E0]'}`} />
                  </div>
                ))}
              </div>
            </>
          )}

          {kind === 'sessions' && (
            <div className="flex flex-col rounded-card bg-page px-4 py-1">
              {[
                { k: 'Chrome · MacBook · Madrid', v: 'Esta sesión · ahora', cur: true },
                ...(killedSession ? [] : [{ k: 'Safari · iPhone · Madrid', v: 'hace 2 h', cur: false }]),
              ].map((r, i) => (
                <div key={r.k} className={`flex items-center gap-3 py-3.5 ${i ? 'border-t border-[#E6E5EC]' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{r.k}</p>
                    <p className="text-[13px] text-ink-2">{r.v}</p>
                  </div>
                  {r.cur ? (
                    <span className="rounded-pill bg-[#E9FBEF] px-2.5 py-1 text-[11px] font-semibold text-[#15803D]">Actual</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setKilledSession(true); onToast('Sesión cerrada'); }}
                      className="h-8 rounded-pill border-[1.5px] border-line bg-white px-3 text-[12px] font-semibold"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {hasSave && (
          <footer className="flex shrink-0 gap-2.5 border-t border-line px-5 pb-6 pt-3.5">
            <button type="button" onClick={onBack} className="h-[50px] rounded-pill bg-[#F2F2F7] px-5 text-[14px] font-semibold">
              Atrás
            </button>
            <button type="button" onClick={save} className="h-[50px] flex-1 rounded-pill bg-grad text-[15px] font-bold text-white">
              Guardar
            </button>
          </footer>
        )}

        {kind === 'sessions' && (
          <footer className="shrink-0 border-t border-line px-5 pb-6 pt-3.5">
            <button
              type="button"
              onClick={() => { onToast('Sesión de Safari · iPhone cerrada'); onClose(); }}
              className="h-[50px] w-full rounded-pill bg-grad text-[15px] font-bold text-white"
            >
              Cerrar las demás sesiones
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
