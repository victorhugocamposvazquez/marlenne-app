'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

const PATHS = [
  { label: 'Hoy', path: '/hoy', phrase: 'qué hay hoy' },
  { label: 'Nueva cita', path: '/agenda?new=1', phrase: 'nueva cita' },
  { label: 'Lista de espera', path: '/agenda?wait=1', phrase: 'lista de espera' },
];

export default function IosShortcutsCard() {
  const toast = useToast();
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast('Copiado');
    } catch {
      toast('No se ha podido copiar', 'err');
    }
  };

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[.04em] text-ink-3">
        iPhone · Siri y atajos
      </h2>
      <div className="rounded-row border border-surface-line bg-white p-3.5 shadow-card">
        <p className="text-[12.5px] font-medium leading-snug text-ink-2">
          Safari → Compartir → Añadir a pantalla de inicio. Siri no ve la PWA:
          crea un Atajo «Abrir URL» y añádelo a Siri. Si abre Safari en vez del
          icono, prueba la URL <span className="font-bold">webapp://</span>.
        </p>
        <p className="mt-2 text-[12.5px] font-medium leading-snug text-ink-2">
          Dentro de la app, el micrófono (o escribir) ejecuta agenda: huecos,
          citas, pasa, no vino. Si hay clave de modelo, se puede hablar normal.
          Solo agenda, nunca ficha clínica.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {PATHS.map(p => {
            const https = `${origin}${p.path}`;
            const webapp = `webapp://${origin.replace(/^https?:\/\//, '')}${p.path}`;
            return (
              <li key={p.path} className="rounded-[12px] bg-surface-bg px-3 py-2">
                <div className="text-[13px] font-bold">«{p.phrase}»</div>
                <button
                  type="button"
                  onClick={() => copy(https)}
                  className="mt-0.5 block w-full truncate text-left text-[11px] font-semibold text-v-d"
                >
                  {https || p.path}
                </button>
                <button
                  type="button"
                  onClick={() => copy(webapp)}
                  className="block w-full truncate text-left text-[11px] font-medium text-ink-3"
                >
                  {origin ? webapp : `webapp://…${p.path}`}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
